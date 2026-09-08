"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { seguradoraSchema } from "@/lib/validations/seguradora";

function parseSeguradoraFormData(formData: FormData) {
  const parsed = seguradoraSchema.safeParse({
    nome: formData.get("nome"),
    susep: formData.get("susep"),
    cnpj: formData.get("cnpj"),
    telefone: formData.get("telefone"),
    site: formData.get("site"),
    obs: formData.get("obs"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  return parsed.data;
}

export async function createSeguradora(formData: FormData) {
  await requireAdmin();
  const seguradora = parseSeguradoraFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("seguradoras").insert(seguradora);
  if (error) throw new Error(error.message);

  revalidatePath("/seguradoras");
  redirect("/seguradoras");
}

export async function updateSeguradora(id: string, formData: FormData) {
  await requireAdmin();
  const seguradora = parseSeguradoraFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("seguradoras").update(seguradora).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/seguradoras");
  redirect("/seguradoras");
}

export async function deleteSeguradora(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("seguradoras").delete().eq("id", id).eq("bloqueada", false);
  if (error) throw new Error(error.message);

  revalidatePath("/seguradoras");
  redirect("/seguradoras");
}
