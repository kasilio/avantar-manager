"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario, requireAdmin } from "@/lib/auth/get-current-usuario";

/** Admin revisou o rascunho e manda pro vendedor ver e confirmar os totais. */
export async function enviarAcerto(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("comissoes_acertos")
    .update({ status: "enviado", enviado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "rascunho");
  if (error) throw new Error(error.message);

  revalidatePath("/comissoes");
  revalidatePath(`/comissoes/${id}`);
}

/** Vendedor confere o extrato e confirma que os valores a receber batem. */
export async function confirmarAcerto(id: string) {
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("comissoes_acertos")
    .update({ status: "confirmado", confirmado_em: new Date().toISOString(), confirmado_por: usuario.id })
    .eq("id", id)
    .eq("vendedor_id", usuario.id)
    .eq("status", "enviado");
  if (error) throw new Error(error.message);

  revalidatePath("/comissoes");
  revalidatePath(`/comissoes/${id}`);
}

/** Admin já fez o pagamento ao vendedor fora do sistema e registra aqui. */
export async function marcarAcertoPago(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("comissoes_acertos")
    .update({
      status: "pago",
      pago_em: new Date().toISOString(),
      data_pagamento: String(formData.get("data_pagamento") ?? ""),
    })
    .eq("id", id)
    .eq("status", "confirmado");
  if (error) throw new Error(error.message);

  revalidatePath("/comissoes");
  revalidatePath(`/comissoes/${id}`);
}
