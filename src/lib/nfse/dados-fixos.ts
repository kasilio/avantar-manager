/**
 * Dados fixos da DPS/NFS-e, migrados de Contador/NFS/dados-fixos.json (que
 * continua existindo só como referência humana legível). Nada aqui é
 * segredo — o certificado (a parte sensível) nunca esteve neste arquivo.
 *
 * Os códigos de município (`codigoIbge`) e de tributação (`cTribNac`) são
 * usados sem pontuação nas chamadas reais — ver `limparDigitos`.
 */

export const PRESTADOR = {
  cnpj: "63702590000114",
  nome: "MAGALHAES ASSESSORIA E CORRETORA DE SEGUROS LTDA",
  codigoIbge: "4106902", // Curitiba/PR
  uf: "PR",
  cep: "81200240",
  logradouro: "RUA JOSÉ IZIDORO BIAZETTO",
  numero: "1210",
  bairro: "CAMPO COMPRIDO",
  email: "MATHEUSMAGALHAES@AVANTAR.COM.BR",
  telefone: "4198576379",
  // TSOpSimpNac: 3 = Optante - Microempresa ou Empresa de Pequeno Porte (ME/EPP)
  opSimpNac: "3",
} as const;

export const TOMADOR = {
  cnpj: "36260165000140",
  nome: "AVANTAR ASSESSORIA E CORRETORA DE SEGUROS CONSORCIOS E PLANOS DE SAUDE LTDA",
  codigoIbge: "3131307", // Ipatinga/MG
  uf: "MG",
  cep: "35162084",
  logradouro: "JURUPARI",
  numero: "40",
  complemento: "APT 0301 BLOCO 009",
  bairro: "IGUACU",
} as const;

export const SERVICO = {
  // TSCodTribNac: 6 dígitos numéricos (2 Item + 2 Subitem LC 116/2003 + 2
  // Desdobro Nacional), sem pontuação — "10.01.02" vira "100102".
  codigoTributacaoNacional: "100102",
  codigoNbs: "109061100", // "1.0906.11.00" sem pontuação (TSCodNBS: 9 dígitos)
  // "Descrição da natureza" (ex. "Agenciamento, corretagem ou intermediação
  // de seguros.") é derivada pelo próprio sistema a partir de cTribNac — só
  // "descricaoServico" é o texto livre que vai no xDescServ da DPS (o que o
  // emitente de fato digita; na nota nº16 foi "Serviços Prestados").
  descricaoServico: "Serviços Prestados",
  // cLocPrestacao: código IBGE do município onde o serviço foi prestado —
  // mesmo município do prestador (Curitiba), serviço não é de obra/exterior.
  codigoMunicipioPrestacao: "4106902",
  // TSTribISSQN: 1 = Operação tributável. TSTipoRetISSQN: 1 = Não Retido.
  tribIssqn: "1",
  tipoRetencaoIssqn: "1",
} as const;

// Faixas de série por tipo de emissor (confirmado na planilha oficial
// ANEXO_I, regra do erro E0010, depois de uma rejeição real):
//   00001–49999 = emissão por aplicativo próprio (API) — nosso caso;
//   50000–69999 = emissor móvel; 70000–79999 = emissor Web (usado na nota
//   nº16, emitida pelo portal nfse.gov.br — por isso não serve aqui).
export const SERIE_DPS_PADRAO = "00001";

/** Código do município emissor da NFS-e (cLocEmi) — sempre o do prestador. */
export const CODIGO_MUNICIPIO_EMISSOR = PRESTADOR.codigoIbge;
