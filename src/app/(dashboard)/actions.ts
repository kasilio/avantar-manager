"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Edição manual da meta do mês — marca `gerado_automaticamente: false` pra
 * não ser sobrescrita depois. */
export async function upsertMetaMensal(periodo: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const valor = Number(formData.get("valor") ?? 0);

  const { data: existente } = await supabase.from("metas_mensais").select("periodo").eq("periodo", periodo).maybeSingle();
  const { error } = existente
    ? await supabase.from("metas_mensais").update({ valor, gerado_automaticamente: false }).eq("periodo", periodo)
    : await supabase.from("metas_mensais").insert({ periodo, valor, gerado_automaticamente: false });
  if (error) throw new Error(error.message);

  revalidatePath("/");
}
