"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { despesaSchema, settingsSchema } from "@/lib/validations/despesa";
import { parseDasPdf } from "@/lib/import/parse-das-pdf";
import { diasNoMes, mesLabel, periodoAtual } from "@/lib/format";
import { regenerarTarefasDespesa } from "@/lib/despesas-tarefas";

function parseDespesaFormData(formData: FormData) {
  // Os campos "data", "parcelas_total" e "parcela_inicio" só existem no DOM
  // quando o tipo correspondente está selecionado (ver despesa-dialog-form.tsx)
  // — pros outros tipos, formData.get() volta null, e o schema (z.string())
  // rejeita null (só aceita string | undefined), então sem o `?? ""` o
  // cadastro quebrava com "Expected string, received null" pra todo tipo.
  const parsed = despesaSchema.safeParse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    categoria: formData.get("categoria") ?? "",
    dia_vencimento: formData.get("dia_vencimento") ?? "",
    data: formData.get("data") ?? "",
    parcelas_total: formData.get("parcelas_total") ?? "",
    parcela_inicio: formData.get("parcela_inicio") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const data = parsed.data;
  return {
    ...data,
    dia_vencimento: data.tipo === "fixa" || data.tipo === "parcelada" ? data.dia_vencimento || null : null,
    data: data.tipo === "variavel" ? data.data || null : null,
    parcelas_total: data.tipo === "parcelada" ? data.parcelas_total || null : null,
    parcela_inicio: data.tipo === "parcelada" ? data.parcela_inicio || periodoAtual() : null,
  };
}

export async function createDespesa(formData: FormData) {
  await requireAdmin();
  const despesa = parseDespesaFormData(formData);
  const supabase = await createClient();

  const { data: criada, error } = await supabase.from("despesas").insert(despesa).select("*").single();
  if (error) throw new Error(error.message);

  await supabase
    .from("despesas_historico_valores")
    .insert({ despesa_id: criada.id, periodo: periodoAtual(), valor: criada.valor });
  await regenerarTarefasDespesa(supabase, criada);

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function updateDespesa(id: string, formData: FormData) {
  await requireAdmin();
  const despesa = parseDespesaFormData(formData);
  const supabase = await createClient();

  const { data: anterior } = await supabase.from("despesas").select("valor").eq("id", id).single();

  const { data: atualizada, error } = await supabase.from("despesas").update(despesa).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);

  // Muda o valor de uma despesa fixa/parcelada: só vale a partir do mês
  // vigente, meses já fechados continuam com o valor antigo no DRE.
  if (anterior && Number(anterior.valor) !== Number(atualizada.valor)) {
    await supabase
      .from("despesas_historico_valores")
      .delete()
      .eq("despesa_id", id)
      .eq("periodo", periodoAtual());
    await supabase
      .from("despesas_historico_valores")
      .insert({ despesa_id: id, periodo: periodoAtual(), valor: atualizada.valor });
  }
  await regenerarTarefasDespesa(supabase, atualizada);

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function deleteDespesa(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  await supabase.from("tarefas").delete().eq("origem_despesa_id", id);
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/");
}

export async function marcarDespesaPaga(despesaId: string, periodo: string) {
  await requireAdmin();
  const supabase = await createClient();

  // Evita depender de upsert (a constraint unique(despesa_id, periodo) já
  // impede duplicidade real): limpa qualquer registro do mesmo período antes
  // de inserir, mesmo padrão usado pra substituir contatos do cliente.
  await supabase.from("despesas_pagamentos").delete().eq("despesa_id", despesaId).eq("periodo", periodo);
  const { error } = await supabase
    .from("despesas_pagamentos")
    .insert({ despesa_id: despesaId, periodo, data_pagamento: new Date().toISOString().slice(0, 10) });
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function reabrirDespesaPaga(despesaId: string, periodo: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("despesas_pagamentos")
    .delete()
    .eq("despesa_id", despesaId)
    .eq("periodo", periodo);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function updateSettings(formData: FormData) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    aliquota_simples: formData.get("aliquota_simples"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("settings").update(parsed.data).eq("id", true);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
  revalidatePath("/");
}

/** Lê o PDF do DAS só pra pré-preencher o formulário de fechamento — nunca
 * bloqueia (o usuário sempre confirma/edita os campos antes de fechar). */
export async function parseDas(formData: FormData) {
  await requireAdmin();
  const arquivo = formData.get("das_arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { numeroDocumento: null, vencimento: null, valor: null };
  }
  try {
    return await parseDasPdf(new Uint8Array(await arquivo.arrayBuffer()));
  } catch {
    return { numeroDocumento: null, vencimento: null, valor: null };
  }
}

/** Fecha o mês: só permite se não sobrar nenhum lote de repasse daquele mês
 * ainda pendente de pagamento (senão lista quais). */
export async function fecharMes(periodo: string, formData: FormData) {
  const usuario = await requireAdmin();
  const supabase = await createClient();

  const inicioMes = `${periodo}-01`;
  const fimMes = `${periodo}-${String(diasNoMes(periodo)).padStart(2, "0")}`;
  const { data: lotesDoMes } = await supabase
    .from("repasses_lotes")
    .select("id, periodo_inicio, periodo_fim, status")
    .lte("periodo_inicio", fimMes)
    .gte("periodo_fim", inicioMes);
  const pendentes = (lotesDoMes ?? []).filter((l) => l.status !== "pago");
  if (pendentes.length > 0) {
    throw new Error(
      `Ainda há ${pendentes.length} repasse(s) desse mês sem pagamento confirmado — feche a NF/pagamento deles primeiro (${pendentes.map((l) => `${l.periodo_inicio} a ${l.periodo_fim}`).join(", ")}).`,
    );
  }

  const numeroDocumento = String(formData.get("das_numero_documento") ?? "").trim() || null;
  const vencimentoRaw = String(formData.get("das_vencimento") ?? "");
  const valor = Number(formData.get("das_valor") ?? 0);
  const arquivo = formData.get("das_arquivo");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  const { data: existente } = await supabase.from("fechamentos_mensais").select("periodo").eq("periodo", periodo).maybeSingle();
  const payload = {
    das_numero_documento: numeroDocumento,
    das_vencimento: vencimentoRaw || null,
    das_valor: valor,
    ...(temArquivo
      ? {
          das_arquivo_nome: (arquivo as File).name,
          das_arquivo_base64: Buffer.from(await (arquivo as File).arrayBuffer()).toString("base64"),
        }
      : {}),
    fechado_em: new Date().toISOString(),
    fechado_por: usuario.id,
  };

  const { error } = existente
    ? await supabase.from("fechamentos_mensais").update(payload).eq("periodo", periodo)
    : await supabase.from("fechamentos_mensais").insert({ periodo, das_arquivo_nome: null, das_arquivo_base64: null, ...payload });
  if (error) throw new Error(error.message);

  if (vencimentoRaw) {
    const tituloTarefa = `Pagar DAS de ${mesLabel(periodo)}`;
    const { data: tarefaExistente } = await supabase
      .from("tarefas")
      .select("id")
      .eq("titulo", tituloTarefa)
      .maybeSingle();
    if (tarefaExistente) {
      await supabase.from("tarefas").update({ data: vencimentoRaw, concluida: false }).eq("id", tarefaExistente.id);
    } else {
      await supabase.from("tarefas").insert({
        titulo: tituloTarefa,
        data: vencimentoRaw,
        descricao: `Vencimento do DAS (Simples Nacional) referente a ${mesLabel(periodo)}${numeroDocumento ? ` — documento ${numeroDocumento}` : ""}.`,
        vendedor_id: null,
      });
    }
  }

  revalidatePath("/financeiro");
  revalidatePath("/tarefas");
  revalidatePath("/");
}

/** Reabre o mês (mantém os dados do DAS já preenchidos, só destranca). */
export async function reabrirMes(periodo: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("fechamentos_mensais").update({ fechado_em: null }).eq("periodo", periodo);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}
