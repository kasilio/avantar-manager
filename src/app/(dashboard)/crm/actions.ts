"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { prospeccaoSchema } from "@/lib/validations/prospeccao";
import { today } from "@/lib/format";

function parseProspeccaoFormData(formData: FormData) {
  const parsed = prospeccaoSchema.safeParse({
    empresa: formData.get("empresa"),
    cliente_id: formData.get("cliente_id"),
    tipo_produto_id: formData.get("tipo_produto_id"),
    coluna_id: formData.get("coluna_id") || "novo",
    next_contact: formData.get("next_contact"),
    obs: formData.get("obs"),
    vendedor_id: formData.get("vendedor_id"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const data = parsed.data;
  return { ...data, next_contact: data.next_contact || null };
}

export async function createProspeccao(formData: FormData) {
  const usuario = await requireCurrentUsuario();
  const prospeccao = parseProspeccaoFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("prospeccoes").insert({
    ...prospeccao,
    vendedor_id: prospeccao.vendedor_id ?? (usuario.papel === "vendedor" ? usuario.id : null),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/crm");
}

export async function updateProspeccao(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const prospeccao = parseProspeccaoFormData(formData);
  const supabase = await createClient();

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

/** Chamado pelo drag-and-drop do kanban — só move de coluna. */
export async function moverProspeccao(id: string, colunaId: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("prospeccoes").update({ coluna_id: colunaId }).eq("id", id);
  if (error) throw new Error(error.message);

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
