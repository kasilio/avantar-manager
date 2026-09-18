"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { seguradoraSchema } from "@/lib/validations/seguradora";

function parseSeguradoraFormData(formData: FormData) {
  let contatos: unknown = [];
  try {
    contatos = JSON.parse(String(formData.get("contatos_json") ?? "[]"));
  } catch {
    contatos = [];
  }

  const parsed = seguradoraSchema.safeParse({
    nome: formData.get("nome"),
    contatos,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { contatos: contatosData, ...seguradora } = parsed.data;
  return { seguradora, contatos: contatosData.filter((c) => c.nome) };
}

export async function createSeguradora(formData: FormData) {
  await requireAdmin();
  const { seguradora, contatos } = parseSeguradoraFormData(formData);
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("seguradoras")
    .insert({ ...seguradora, susep: null, cnpj: null, telefone: null, site: null, obs: null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (contatos.length > 0) {
    const { error: contatosError } = await supabase
      .from("seguradoras_contatos")
      .insert(contatos.map((c) => ({ ...c, seguradora_id: created.id })));
    if (contatosError) throw new Error(contatosError.message);
  }

  revalidatePath("/seguradoras");
  redirect("/seguradoras");
}

export async function updateSeguradora(id: string, formData: FormData) {
  await requireAdmin();
  const { seguradora, contatos } = parseSeguradoraFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("seguradoras").update(seguradora).eq("id", id);
  if (error) throw new Error(error.message);

  // Substitui os contatos por completo — mesmo padrão de clientes/actions.ts.
  const { error: delError } = await supabase.from("seguradoras_contatos").delete().eq("seguradora_id", id);
  if (delError) throw new Error(delError.message);
  if (contatos.length > 0) {
    const { error: insError } = await supabase
      .from("seguradoras_contatos")
      .insert(contatos.map((c) => ({ ...c, seguradora_id: id })));
    if (insError) throw new Error(insError.message);
  }

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
