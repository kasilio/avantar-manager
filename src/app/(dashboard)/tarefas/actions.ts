"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { tarefaSchema } from "@/lib/validations/tarefa";

export async function createTarefa(formData: FormData) {
  const usuario = await requireCurrentUsuario();
  const parsed = tarefaSchema.safeParse({
    titulo: formData.get("titulo"),
    data: formData.get("data"),
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tarefas").insert({
    ...parsed.data,
    vendedor_id: usuario.papel === "vendedor" ? usuario.id : null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

export async function toggleTarefa(id: string, concluida: boolean) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("tarefas").update({ concluida }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}

export async function deleteTarefa(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("tarefas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/tarefas");
}
