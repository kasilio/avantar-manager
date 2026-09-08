"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/lib/validations/usuario";

/**
 * Cria o login do usuário (via Admin API — só ela pode criar contas no
 * Supabase Auth) e o registro correspondente em `usuarios`. Diferente do
 * ERP-TRANSPORTADORA (que só documenta criar usuário manual no Studio),
 * aqui isso é uma tela de verdade porque "vendedor ter login próprio" foi
 * um requisito explícito do produto.
 */
export async function createUsuario(formData: FormData) {
  await requireAdmin();

  const parsed = usuarioCreateSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha_inicial: formData.get("senha_inicial"),
    papel: formData.get("papel"),
    cpf: formData.get("cpf"),
    susep: formData.get("susep"),
    whatsapp: formData.get("whatsapp"),
    pix: formData.get("pix"),
    obs: formData.get("obs"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  const { senha_inicial, ...usuario } = parsed.data;

  const adminClient = createAdminClient();
  const { data: created, error: authError } = await adminClient.auth.admin.createUser({
    email: usuario.email,
    password: senha_inicial,
    email_confirm: true,
  });
  if (authError || !created.user) {
    throw new Error(authError?.message ?? "Não foi possível criar o login.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("usuarios").insert({ id: created.user.id, ativo: true, ...usuario });
  if (error) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUsuario(id: string, formData: FormData) {
  await requireAdmin();

  const parsed = usuarioUpdateSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    papel: formData.get("papel"),
    cpf: formData.get("cpf"),
    susep: formData.get("susep"),
    whatsapp: formData.get("whatsapp"),
    pix: formData.get("pix"),
    obs: formData.get("obs"),
    ativo: formData.get("ativo") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("usuarios").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function deleteUsuario(id: string) {
  const admin = await requireAdmin();
  if (admin.id === id) throw new Error("Você não pode excluir seu próprio usuário.");

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
