"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { producaoSchema } from "@/lib/validations/producao";

function parseProducaoFormData(formData: FormData) {
  const parsed = producaoSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    tipo_produto_id: formData.get("tipo_produto_id"),
    seguradora_id: formData.get("seguradora_id"),
    num_apolice: formData.get("num_apolice"),
    num_proposta: formData.get("num_proposta"),
    vigencia_inicio: formData.get("vigencia_inicio"),
    vigencia_fim: formData.get("vigencia_fim"),
    status_manual: formData.get("status_manual") || "ativa",
    vendedor_id: formData.get("vendedor_id"),
    comissao_pct: formData.get("comissao_pct"),
    obs: formData.get("obs"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const data = parsed.data;
  return {
    ...data,
    vigencia_inicio: data.vigencia_inicio || null,
    vigencia_fim: data.vigencia_fim || null,
  };
}

export async function createProducao(formData: FormData) {
  await requireCurrentUsuario();
  const producao = parseProducaoFormData(formData);
  const supabase = await createClient();

  // premio_mensal/premio_total/comissao_bruta_pct/parcelas/data_renovacao não
  // são editáveis por aqui — vêm da importação de repasse — mas o insert
  // exige as colunas presentes, então entram como null.
  const { data: created, error } = await supabase
    .from("producoes")
    .insert({
      ...producao,
      premio_mensal: null,
      premio_total: null,
      comissao_bruta_pct: null,
      parcelas: null,
      data_renovacao: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/producoes");
  revalidatePath(`/clientes/${producao.cliente_id}`);
  redirect(`/producoes/${created.id}`);
}

export async function updateProducao(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const producao = parseProducaoFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("producoes").update(producao).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/producoes");
  revalidatePath(`/producoes/${id}`);
  revalidatePath(`/clientes/${producao.cliente_id}`);
  redirect(`/producoes/${id}`);
}

export async function deleteProducao(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("producoes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/producoes");
  redirect("/producoes");
}

export async function concluirFollowup(id: string, producaoId: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("followups")
    .update({ concluido_em: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/producoes/${producaoId}`);
  revalidatePath("/crm");
  revalidatePath("/tarefas");
}
