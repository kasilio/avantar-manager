"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { nfseRascunhoSchema } from "@/lib/validations/nfse";
import { nfseEnv } from "@/lib/nfse/env";
import { SERIE_DPS_PADRAO } from "@/lib/nfse/dados-fixos";
import { proximoNumeroDps } from "@/lib/nfse/numero-dps";
import { montarDpsXml } from "@/lib/nfse/dps-xml";
import { assinarDps } from "@/lib/nfse/assinatura";
import { enviarDps } from "@/lib/nfse/client";

/** Monta e salva o XML (sem assinar) de uma nova tentativa de emissão —
 * valor e competência sempre informados manualmente, nunca calculados. */
export async function criarRascunho(formData: FormData) {
  const usuario = await requireAdmin();
  const parsed = nfseRascunhoSchema.safeParse({
    valor: formData.get("valor"),
    competencia: formData.get("competencia"),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const supabase = await createClient();
  const ambiente = nfseEnv().NFSE_AMBIENTE;
  const numeroDps = await proximoNumeroDps(supabase, SERIE_DPS_PADRAO);
  const dpsXml = montarDpsXml({
    numeroDps,
    valor: parsed.data.valor,
    competencia: parsed.data.competencia,
    ambiente,
  });

  const { data: criada, error } = await supabase
    .from("nfse_emissoes")
    .insert({
      competencia: parsed.data.competencia,
      valor: parsed.data.valor,
      serie_dps: SERIE_DPS_PADRAO,
      numero_dps: numeroDps,
      ambiente,
      dps_xml: dpsXml,
      dps_xml_assinado: null,
      chave_acesso: null,
      numero_nfse: null,
      nfse_xml: null,
      motivo_rejeicao: null,
      erro_detalhe: null,
      payload_enviado: null,
      payload_resposta: null,
      criado_por: usuario.id,
      confirmado_por: null,
      confirmado_em: null,
      transmitido_em: null,
      autorizado_em: null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro/nfse");
  redirect(`/financeiro/nfse/${criada.id}`);
}

/** Assina o XML do rascunho com o certificado da empresa. */
export async function assinarRascunho(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: emissao, error: fetchError } = await supabase
    .from("nfse_emissoes")
    .select("status, dps_xml")
    .eq("id", id)
    .single();
  if (fetchError || !emissao) throw new Error("NF não encontrada.");
  if (emissao.status !== "rascunho") throw new Error("Só é possível assinar uma NF que ainda está em rascunho.");
  if (!emissao.dps_xml) throw new Error("Rascunho sem XML gerado.");

  const dpsXmlAssinado = assinarDps(emissao.dps_xml);

  const { error } = await supabase
    .from("nfse_emissoes")
    .update({ dps_xml_assinado: dpsXmlAssinado, status: "assinado" })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/financeiro/nfse/${id}`);
}

/**
 * Transmite a NF assinada ao Ambiente Nacional (POST /nfse da Sefin
 * Nacional, confirmado via o spec OpenAPI oficial obtido com o próprio
 * certificado em mTLS). Em ambiente "producao" exige a trava dupla
 * `NFSE_PERMITIR_PRODUCAO=true` além de `NFSE_AMBIENTE=producao` — evita
 * transmitir de verdade por um ambiente mal configurado.
 */
export async function transmitir(id: string) {
  const usuario = await requireAdmin();
  const supabase = await createClient();

  const { data: emissao, error: fetchError } = await supabase
    .from("nfse_emissoes")
    .select("status, ambiente, dps_xml_assinado")
    .eq("id", id)
    .single();
  if (fetchError || !emissao) throw new Error("NF não encontrada.");
  if (emissao.status !== "assinado") throw new Error("Só é possível transmitir uma NF já assinada.");
  if (!emissao.dps_xml_assinado) throw new Error("NF sem XML assinado.");

  const env = nfseEnv();
  if (emissao.ambiente === "producao" && !env.NFSE_PERMITIR_PRODUCAO) {
    throw new Error(
      "Transmissão em produção real bloqueada: defina NFSE_PERMITIR_PRODUCAO=true (além de NFSE_AMBIENTE=producao) só depois de validar um ciclo completo em restrita.",
    );
  }

  await supabase
    .from("nfse_emissoes")
    .update({ status: "enviando", confirmado_por: usuario.id, confirmado_em: new Date().toISOString() })
    .eq("id", id);

  try {
    const resultado = await enviarDps(emissao.dps_xml_assinado, emissao.ambiente);
    const agora = new Date().toISOString();

    if (resultado.autorizado) {
      const { error: updError } = await supabase
        .from("nfse_emissoes")
        .update({
          status: "autorizado",
          chave_acesso: resultado.chaveAcesso,
          numero_nfse: resultado.numeroNfse,
          nfse_xml: resultado.nfseXml,
          payload_resposta: resultado.payloadResposta,
          transmitido_em: agora,
          autorizado_em: agora,
        })
        .eq("id", id);
      // A NFS-e já foi autorizada pelo governo nesse ponto — um erro aqui é
      // só o nosso registro não refletir isso ainda, não motivo pra lançar
      // como se a transmissão tivesse falhado (evitaria um reenvio indevido).
      if (updError) console.error(`[nfse] falha ao salvar autorização da emissão ${id}`, updError);
    } else {
      const { error: updError } = await supabase
        .from("nfse_emissoes")
        .update({
          status: "rejeitado",
          motivo_rejeicao: resultado.motivoRejeicao,
          payload_resposta: resultado.payloadResposta,
          transmitido_em: agora,
        })
        .eq("id", id);
      if (updError) console.error(`[nfse] falha ao salvar rejeição da emissão ${id}`, updError);
      throw new Error(resultado.motivoRejeicao);
    }
  } catch (err) {
    if (!(err instanceof Error) || !err.message) throw err;
    // Rejeição de negócio já foi persistida como "rejeitado" acima — só
    // grava "erro" (falha de transporte/infra) se ainda não foi tratada.
    const { data: atual } = await supabase.from("nfse_emissoes").select("status").eq("id", id).single();
    if (atual?.status === "enviando") {
      await supabase.from("nfse_emissoes").update({ status: "erro", erro_detalhe: err.message }).eq("id", id);
    }
    throw err;
  } finally {
    revalidatePath(`/financeiro/nfse/${id}`);
  }
}

/** Remove um rascunho ainda não assinado (nunca apaga nada já assinado/transmitido). */
export async function cancelarRascunho(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("nfse_emissoes").delete().eq("id", id).eq("status", "rascunho");
  if (error) throw new Error(error.message);

  revalidatePath("/financeiro/nfse");
  redirect("/financeiro/nfse");
}
