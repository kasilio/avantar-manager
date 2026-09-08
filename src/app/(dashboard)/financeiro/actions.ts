"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { despesaSchema, settingsSchema } from "@/lib/validations/despesa";

function parseDespesaFormData(formData: FormData) {
  const parsed = despesaSchema.safeParse({
    tipo: formData.get("tipo"),
    descricao: formData.get("descricao"),
    valor: formData.get("valor"),
    categoria: formData.get("categoria"),
    dia_vencimento: formData.get("dia_vencimento"),
    data: formData.get("data"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const data = parsed.data;
  return {
    ...data,
    dia_vencimento: data.tipo === "fixa" ? data.dia_vencimento || null : null,
    data: data.tipo === "variavel" ? data.data || null : null,
  };
}

export async function createDespesa(formData: FormData) {
  await requireAdmin();
  const despesa = parseDespesaFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("despesas").insert(despesa);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function updateDespesa(id: string, formData: FormData) {
  await requireAdmin();
  const despesa = parseDespesaFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("despesas").update(despesa).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
}

export async function deleteDespesa(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro");
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
    meta_mensal: formData.get("meta_mensal"),
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
