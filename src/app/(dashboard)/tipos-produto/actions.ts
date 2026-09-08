"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { tipoProdutoSchema } from "@/lib/validations/tipo-produto";

function parseTipoProdutoFormData(formData: FormData) {
  const parsed = tipoProdutoSchema.safeParse({
    nome: formData.get("nome"),
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  return parsed.data;
}

export async function createTipoProduto(formData: FormData) {
  await requireAdmin();
  const tipo = parseTipoProdutoFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("tipos_produto").insert(tipo);
  if (error) throw new Error(error.message);

  revalidatePath("/tipos-produto");
  redirect("/tipos-produto");
}

export async function updateTipoProduto(id: string, formData: FormData) {
  await requireAdmin();
  const tipo = parseTipoProdutoFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("tipos_produto").update(tipo).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/tipos-produto");
  redirect("/tipos-produto");
}

export async function deleteTipoProduto(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("tipos_produto").delete().eq("id", id).eq("bloqueada", false);
  if (error) throw new Error(error.message);

  revalidatePath("/tipos-produto");
  redirect("/tipos-produto");
}
