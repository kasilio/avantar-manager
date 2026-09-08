import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/database";

/**
 * Busca o registro `usuarios` (nome, papel, etc.) do usuário autenticado na
 * sessão atual. Retorna null se não houver sessão válida.
 *
 * Toda Server Action de escrita deve usar esta função pra saber quem está
 * agindo (papel admin/vendedor, e o próprio id pra gravar como `vendedor_id`
 * quando fizer sentido) — nunca confiar em algo vindo do form/client.
 */
export async function getCurrentUsuario(): Promise<Usuario | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return data;
}

/**
 * Mesmo que getCurrentUsuario, mas lança erro se não houver sessão — uso em
 * Server Actions e páginas que já pressupõem autenticação (o middleware já
 * redireciona não-autenticados pra /login antes de chegar aqui).
 */
export async function requireCurrentUsuario(): Promise<Usuario> {
  const usuario = await getCurrentUsuario();
  if (!usuario) {
    throw new Error("Usuário não autenticado.");
  }
  return usuario;
}

/**
 * Mesmo que requireCurrentUsuario, mas também exige papel admin — uso em
 * Server Actions restritas (gerenciar cadastros, financeiro, criar login de
 * vendedor).
 */
export async function requireAdmin(): Promise<Usuario> {
  const usuario = await requireCurrentUsuario();
  if (usuario.papel !== "admin") {
    throw new Error("Ação restrita ao administrador.");
  }
  return usuario;
}
