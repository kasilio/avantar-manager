"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { repasseSchema } from "@/lib/validations/repasse";

function parseRepasseFormData(formData: FormData) {
  const parsed = repasseSchema.safeParse({
    producao_id: formData.get("producao_id"),
    parcela: formData.get("parcela"),
    periodo: formData.get("periodo"),
    comissao_bruta: formData.get("comissao_bruta"),
    apolice_pct: formData.get("apolice_pct"),
    repasse_pct: formData.get("repasse_pct"),
    status: formData.get("status") || "aguardando_nf",
    nf_info: formData.get("nf_info"),
    data_pagamento: formData.get("data_pagamento"),
    valor_pago: formData.get("valor_pago"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const data = parsed.data;
  return { ...data, data_pagamento: data.data_pagamento || null };
}

export async function createRepasse(formData: FormData) {
  await requireCurrentUsuario();
  const repasse = parseRepasseFormData(formData);
  const supabase = await createClient();

  const { data: created, error } = await supabase.from("repasses").insert(repasse).select("id").single();
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  redirect(`/repasses/${created.id}`);
}

export async function updateRepasse(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const repasse = parseRepasseFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("repasses").update(repasse).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${id}`);
  redirect(`/repasses/${id}`);
}

export async function deleteRepasse(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("repasses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  redirect("/repasses");
}

/** Ação rápida: marca a NF informada e avança pro próximo status. */
export async function informarNf(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("repasses")
    .update({ nf_info: String(formData.get("nf_info") ?? ""), status: "aguardando_pagamento" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${id}`);
}

/** Ação rápida: registra o pagamento e fecha o repasse. */
export async function registrarPagamento(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("repasses")
    .update({
      status: "pago",
      data_pagamento: String(formData.get("data_pagamento") ?? ""),
      valor_pago: Number(formData.get("valor_pago") ?? 0),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${id}`);
}
