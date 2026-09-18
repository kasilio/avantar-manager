"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { prospeccaoSchema } from "@/lib/validations/prospeccao";
import { today } from "@/lib/format";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** "Empresa" no formulário de prospecção é sempre um cliente cadastrado —
 * `cliente_id === "__novo__"` cria um cliente novo só com o nome digitado
 * (o cadastro completo pode ser preenchido depois em Clientes). */
async function resolverClienteEEmpresa(
  supabase: SupabaseServerClient,
  clienteId: string,
  novoNome: string,
): Promise<{ cliente_id: string; empresa: string }> {
  if (clienteId === "__novo__") {
    const nome = novoNome.trim();
    if (!nome) throw new Error("Informe o nome da empresa.");
    const { data: criado, error } = await supabase
      .from("clientes")
      .insert({
        nome,
        tipo_doc: "cnpj",
        fantasia: null,
        cnpj: null,
        cpf: null,
        nascimento: null,
        situacao: null,
        cep: null,
        logradouro: null,
        numero: null,
        bairro: null,
        cidade: null,
        cnae: null,
        porte: null,
        tel: null,
        email_com: null,
        obs: null,
      })
      .select("id, nome")
      .single();
    if (error) throw new Error(error.message);
    return { cliente_id: criado.id, empresa: criado.nome };
  }
  const { data: cliente, error } = await supabase.from("clientes").select("nome").eq("id", clienteId).single();
  if (error || !cliente) throw new Error("Empresa/cliente não encontrado — selecione novamente.");
  return { cliente_id: clienteId, empresa: cliente.nome };
}

async function parseProspeccaoFormData(supabase: SupabaseServerClient, formData: FormData) {
  const parsed = prospeccaoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    empresa_novo_nome: formData.get("empresa_novo_nome"),
    tipo_produto_id: formData.get("tipo_produto_id"),
    coluna_id: formData.get("coluna_id") || "novo",
    next_contact: formData.get("next_contact"),
    obs: formData.get("obs"),
    vendedor_id: formData.get("vendedor_id"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const { cliente_id, empresa_novo_nome, ...data } = parsed.data;
  const { cliente_id: resolvedClienteId, empresa } = await resolverClienteEEmpresa(supabase, cliente_id, empresa_novo_nome);
  return { ...data, cliente_id: resolvedClienteId, empresa, next_contact: data.next_contact || null };
}

export async function createProspeccao(formData: FormData) {
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();
  const prospeccao = await parseProspeccaoFormData(supabase, formData);

  const { error } = await supabase.from("prospeccoes").insert({
    ...prospeccao,
    vendedor_id: prospeccao.vendedor_id ?? (usuario.papel === "vendedor" ? usuario.id : null),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/crm");
}

export async function updateProspeccao(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const supabase = await createClient();
  const prospeccao = await parseProspeccaoFormData(supabase, formData);

  const { error } = await supabase.from("prospeccoes").update(prospeccao).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/crm");
}

export async function deleteProspeccao(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("prospeccoes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/crm");
}

/** Move uma prospecção de coluna — seja arrastando o card no kanban, seja
 * pelo botão "Enviar para a próxima etapa" dentro do detalhe. Toda
 * movimentação exige uma observação, que fica registrada no histórico da
 * negociação (prospeccoes_historico). */
export async function moverProspeccao(id: string, colunaId: string, nota: string) {
  const usuario = await requireCurrentUsuario();
  const notaLimpa = nota.trim();
  if (!notaLimpa) throw new Error("Escreva uma observação sobre essa movimentação.");
  const supabase = await createClient();

  const { data: atual, error: buscaError } = await supabase
    .from("prospeccoes")
    .select("coluna_id")
    .eq("id", id)
    .single();
  if (buscaError || !atual) throw new Error("Prospecção não encontrada.");

  const { error } = await supabase.from("prospeccoes").update({ coluna_id: colunaId }).eq("id", id);
  if (error) throw new Error(error.message);

  const { error: histError } = await supabase.from("prospeccoes_historico").insert({
    prospeccao_id: id,
    coluna_anterior: atual.coluna_id,
    coluna_nova: colunaId,
    nota: notaLimpa,
    usuario_id: usuario.id,
  });
  if (histError) throw new Error(histError.message);

  revalidatePath("/crm");
}

/**
 * Equivalente a verificarFollowupsPerdidos() do legacy/avantar-manager.html:
 * lá era um "cron" client-side no load da página; aqui roda como um passo
 * server-side antes de renderizar o kanban. Prospecções em "Perdido" cujo
 * next_contact (agendado automaticamente +2 meses ao cair em Perdido — ver
 * trigger perdido_agenda_followup na migration) já venceu voltam pro board
 * na coluna "Follow-up".
 */
export async function avancarPerdidosVencidos() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prospeccoes")
    .update({ coluna_id: "followup" })
    .eq("coluna_id", "perdido")
    .lte("next_contact", today());
  if (error) throw new Error(error.message);
}

export async function concluirFollowupCrm(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("followups")
    .update({ concluido_em: today() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/crm");
  revalidatePath("/tarefas");
}
