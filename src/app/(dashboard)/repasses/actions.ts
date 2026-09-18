"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { repasseSchema } from "@/lib/validations/repasse";
import { parseNfPdf } from "@/lib/import/parse-nf-pdf";
import { fmtMoney } from "@/lib/format";

function brDateToIso(d: string): string | null {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseRepasseFormData(formData: FormData) {
  const parsed = repasseSchema.safeParse({
    lote_id: formData.get("lote_id"),
    producao_id: formData.get("producao_id"),
    parcela: formData.get("parcela"),
    periodo: formData.get("periodo"),
    comissao_bruta: formData.get("comissao_bruta"),
    apolice_pct: formData.get("apolice_pct"),
    repasse_pct: formData.get("repasse_pct"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }
  return parsed.data;
}

export async function updateRepasse(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const repasse = parseRepasseFormData(formData);
  const supabase = await createClient();

  const { data: updated, error } = await supabase.from("repasses").update(repasse).eq("id", id).select("lote_id").single();
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${updated.lote_id}`);
  redirect(`/repasses/${updated.lote_id}`);
}

export async function deleteRepasse(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { data: repasse, error: fetchError } = await supabase.from("repasses").select("lote_id").eq("id", id).single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("repasses").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${repasse.lote_id}`);
  redirect(`/repasses/${repasse.lote_id}`);
}

/** Lê o PDF da NFS-e anexada, confere se o valor bate com o repasse, guarda o
 * arquivo (pra download) e avança o lote pro próximo status. */
export async function anexarNf(loteId: string, formData: FormData) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const arquivo = formData.get("nf_arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    throw new Error("Selecione o PDF da NF.");
  }

  const { data: lote, error: loteError } = await supabase
    .from("repasses_lotes")
    .select("comissao_bruta_total")
    .eq("id", loteId)
    .single();
  if (loteError) throw new Error(loteError.message);

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const nf = await parseNfPdf(bytes);

  if (!nf.numero || nf.valor === null) {
    throw new Error("Não consegui ler o número e o valor dessa NF — confira se é o PDF (DANFSe) certo.");
  }
  const esperado = Number(lote.comissao_bruta_total ?? 0);
  if (Math.abs(nf.valor - esperado) > 0.02) {
    throw new Error(
      `O valor da NF (${fmtMoney(nf.valor)}) não bate com o total do repasse (${fmtMoney(esperado)}). Confira se é a NF certa antes de anexar.`
    );
  }

  const { error } = await supabase
    .from("repasses_lotes")
    .update({
      nf_info: nf.numero,
      nf_competencia: nf.competencia ? brDateToIso(nf.competencia) : null,
      nf_arquivo_nome: arquivo.name,
      nf_arquivo_base64: Buffer.from(bytes).toString("base64"),
      status: "aguardando_pagamento",
    })
    .eq("id", loteId);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${loteId}`);
}

/** Ação rápida: registra o pagamento do lote inteiro e conclui o fluxo. */
export async function registrarPagamento(loteId: string, formData: FormData) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase
    .from("repasses_lotes")
    .update({
      status: "pago",
      data_pagamento: String(formData.get("data_pagamento") ?? ""),
      valor_pago: Number(formData.get("valor_pago") ?? 0),
    })
    .eq("id", loteId);
  if (error) throw new Error(error.message);

  revalidatePath("/repasses");
  revalidatePath(`/repasses/${loteId}`);
}
