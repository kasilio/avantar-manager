import { create } from "xmlbuilder2";
import { PRESTADOR } from "./dados-fixos";

const NAMESPACE = "http://www.sped.fazenda.gov.br/nfse";
const VERSAO_LEIAUTE = "1.01";

/**
 * Evento de cancelamento (e101101), schema verificado contra
 * pedRegEvento_v1.01.xsd/tiposEventos_v1.01.xsd (mesmo zip oficial usado
 * pra DPS). É o cancelamento direto (TE101101) — não cobre o fluxo de
 * "Solicitação de Análise Fiscal" (e101103) usado quando o prazo normal de
 * cancelamento já passou.
 */

export type CodigoMotivoCancelamento = "1" | "2" | "9"; // 1=Erro na Emissão, 2=Serviço não Prestado, 9=Outros

export type DadosCancelamento = {
  chaveAcesso: string;
  ambiente: "restrita" | "producao";
  cMotivo: CodigoMotivoCancelamento;
  xMotivo: string; // TSMotivo: 15 a 255 caracteres
};

function formatarDataHoraUtcMenos3(data: Date): string {
  const comOffset = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  const iso = comOffset.toISOString();
  return `${iso.slice(0, 19)}-03:00`;
}

/**
 * Id de 59 posições do pedido de registro de evento: "PRE" + Chave de
 * Acesso NFS-e(50) + código do evento(6) — "101101" é o próprio código de
 * TE101101 (Cancelamento), não um número sequencial escolhido por nós:
 * cancelamento só acontece uma vez por NFS-e (nSeqEvento sempre "001", ver
 * tiposEventos_v1.01.xsd), então não há nada pra sequenciar aqui.
 */
function montarIdPedRegEvt(chaveAcesso: string): string {
  return `PRE${chaveAcesso}101101`;
}

export function montarPedRegEventoCancelamentoXml(dados: DadosCancelamento): string {
  const id = montarIdPedRegEvt(dados.chaveAcesso);
  const tpAmb = dados.ambiente === "producao" ? "1" : "2";

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele(NAMESPACE, "pedRegEvento", { versao: VERSAO_LEIAUTE })
    .ele("infPedReg", { Id: id })
    .ele("tpAmb").txt(tpAmb).up()
    .ele("verAplic").txt("avantar-manager-1.0").up()
    .ele("dhEvento").txt(formatarDataHoraUtcMenos3(new Date())).up()
    .ele("CNPJAutor").txt(PRESTADOR.cnpj).up()
    .ele("chNFSe").txt(dados.chaveAcesso).up()
    .ele("e101101")
      .ele("xDesc").txt("Cancelamento de NFS-e").up()
      .ele("cMotivo").txt(dados.cMotivo).up()
      .ele("xMotivo").txt(dados.xMotivo).up()
    .up()
    .up()
    .up();

  return doc.end({ prettyPrint: false });
}
