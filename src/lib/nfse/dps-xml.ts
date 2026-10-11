import { create } from "xmlbuilder2";
import { CODIGO_MUNICIPIO_EMISSOR, PRESTADOR, SERIE_DPS_PADRAO, SERVICO, TOMADOR } from "./dados-fixos";

const NAMESPACE = "http://www.sped.fazenda.gov.br/nfse";
const VERSAO_LEIAUTE = "1.01";

/**
 * Schema desta DPS verificado contra o XSD oficial (DPS_v1.01.xsd +
 * tiposComplexos_v1.01.xsd, baixados de
 * gov.br/nfse/.../documentacao-atual/nfse-esquemas_xsd-v1-01-20260209.zip)
 * — não é um chute. Um ponto NÃO confirmado na própria documentação (fora
 * do schema) está marcado abaixo: o dígito "tipo de inscrição federal" do
 * Id da DPS.
 */

export type DadosRascunhoDps = {
  numeroDps: number;
  valor: number;
  competencia: string; // "AAAA-MM-DD"
  ambiente: "restrita" | "producao";
};

function formatarDataHoraUtcMenos3(data: Date): string {
  // Curitiba/Brasil não observa horário de verão desde 2019 — UTC-3 fixo.
  const comOffset = new Date(data.getTime() - 3 * 60 * 60 * 1000);
  const iso = comOffset.toISOString(); // "AAAA-MM-DDTHH:mm:ss.sssZ"
  return `${iso.slice(0, 19)}-03:00`;
}

function formatarValor(valor: number): string {
  // TSDec15V2: até 15 dígitos + 2 casas decimais, separador "." — sem
  // milhar, sem zero à esquerda (exceto o próprio "0").
  return valor.toFixed(2);
}

/**
 * Monta o Id de 45 posições da infDPS: "DPS" + Cód.Mun(7) + Tipo de
 * Inscrição Federal(1) + Inscrição Federal(14) + Série(5) + Núm.DPS(15).
 *
 * NÃO CONFIRMADO: o dígito de "tipo de inscrição federal" não tem seus
 * valores (1/2/3/4) documentados explicitamente no texto do XSD — só a
 * ordem do xs:choice (CNPJ, CPF, NIF, cNaoNIF) sugere 1=CNPJ. Confirmar
 * contra o Anexo I (planilha) ou um retorno de rejeição em produção
 * restrita antes de usar em produção real.
 */
function montarIdDps(numeroDps: number, serieDps: string): string {
  const tipoInscricaoFederal = "1"; // 1 = CNPJ (não confirmado, ver acima)
  const inscricaoFederal = PRESTADOR.cnpj.padStart(14, "0");
  const serie = serieDps.padStart(5, "0");
  const numero = String(numeroDps).padStart(15, "0");
  return `DPS${CODIGO_MUNICIPIO_EMISSOR}${tipoInscricaoFederal}${inscricaoFederal}${serie}${numero}`;
}

export function montarDpsXml(dados: DadosRascunhoDps): string {
  const serieDps = SERIE_DPS_PADRAO;
  const id = montarIdDps(dados.numeroDps, serieDps);
  const tpAmb = dados.ambiente === "producao" ? "1" : "2";

  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele(NAMESPACE, "DPS", { versao: VERSAO_LEIAUTE })
    .ele("infDPS", { Id: id })
    .ele("tpAmb").txt(tpAmb).up()
    .ele("dhEmi").txt(formatarDataHoraUtcMenos3(new Date())).up()
    .ele("verAplic").txt("avantar-manager-1.0").up()
    .ele("serie").txt(serieDps).up()
    .ele("nDPS").txt(String(dados.numeroDps)).up()
    .ele("dCompet").txt(dados.competencia).up()
    .ele("tpEmit").txt("1").up() // 1 = Prestador
    .ele("cLocEmi").txt(CODIGO_MUNICIPIO_EMISSOR).up()
    .ele("prest")
      .ele("CNPJ").txt(PRESTADOR.cnpj).up()
      .ele("xNome").txt(PRESTADOR.nome).up()
      .ele("end")
        .ele("endNac")
          .ele("cMun").txt(PRESTADOR.codigoIbge).up()
          .ele("CEP").txt(PRESTADOR.cep).up()
        .up()
        .ele("xLgr").txt(PRESTADOR.logradouro).up()
        .ele("nro").txt(PRESTADOR.numero).up()
        .ele("xBairro").txt(PRESTADOR.bairro).up()
      .up()
      .ele("fone").txt(PRESTADOR.telefone).up()
      .ele("email").txt(PRESTADOR.email).up()
      .ele("regTrib")
        .ele("opSimpNac").txt(PRESTADOR.opSimpNac).up()
        .ele("regEspTrib").txt("0").up() // 0 = Nenhum regime especial
      .up()
    .up()
    .ele("toma")
      .ele("CNPJ").txt(TOMADOR.cnpj).up()
      .ele("xNome").txt(TOMADOR.nome).up()
      .ele("end")
        .ele("endNac")
          .ele("cMun").txt(TOMADOR.codigoIbge).up()
          .ele("CEP").txt(TOMADOR.cep).up()
        .up()
        .ele("xLgr").txt(TOMADOR.logradouro).up()
        .ele("nro").txt(TOMADOR.numero).up()
        .ele("xCpl").txt(TOMADOR.complemento).up()
        .ele("xBairro").txt(TOMADOR.bairro).up()
      .up()
    .up()
    .ele("serv")
      .ele("locPrest")
        .ele("cLocPrestacao").txt(SERVICO.codigoMunicipioPrestacao).up()
      .up()
      .ele("cServ")
        .ele("cTribNac").txt(SERVICO.codigoTributacaoNacional).up()
        .ele("xDescServ").txt(SERVICO.descricaoServico).up()
        .ele("cNBS").txt(SERVICO.codigoNbs).up()
      .up()
    .up()
    .ele("valores")
      .ele("vServPrest")
        .ele("vServ").txt(formatarValor(dados.valor)).up()
      .up()
      .ele("trib")
        .ele("tribMun")
          .ele("tribISSQN").txt(SERVICO.tribIssqn).up()
          .ele("tpRetISSQN").txt(SERVICO.tipoRetencaoIssqn).up()
          // pAliq fica de fora de propósito: Curitiba está no Sistema
          // Nacional NFS-e, então a alíquota já está parametrizada lá —
          // só é obrigatório informar quando o município de incidência
          // NÃO participa do sistema nacional (ver TCTribMunicipal no XSD).
        .up()
        .ele("totTrib")
          // indTotTrib=0: "Não informar nenhum valor estimado para os
          // Tributos (Decreto 8.264/2014)" — opção mais simples do
          // xs:choice, evita estimar tributos federais/estaduais/municipais
          // que não temos como calcular aqui.
          .ele("indTotTrib").txt("0").up()
        .up()
      .up()
    .up()
    .up();

  return doc.end({ prettyPrint: false });
}
