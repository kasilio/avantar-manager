import "server-only";
import { DOMParser } from "@xmldom/xmldom";
import { SignedXml } from "xml-crypto";
import { carregarCertificado } from "./certificado";

/**
 * Assinatura XMLDSig enveloped de um elemento com atributo Id (infDPS ou
 * infPedReg), inserida como <Signature> logo depois dele — exatamente a
 * estrutura exigida pelo XSD oficial (TCDPS/TCPedRegEvt: sequence[infX,
 * ds:Signature minOccurs=0]). Algoritmo (RSA-SHA256 + C14N exclusivo) é o
 * par padrão mais comum em documentos fiscais brasileiros recentes (segue
 * o mesmo perfil usado por NFe/CTe) — confirmado funcionando contra
 * produção restrita de verdade pra DPS; eventos ainda não testados.
 */
function assinarElemento(xml: string, nomeElemento: string): string {
  const certificado = carregarCertificado();
  const idMatch = xml.match(new RegExp(`<${nomeElemento} Id="([^"]+)"`));
  if (!idMatch) throw new Error(`XML sem atributo Id em <${nomeElemento}> — não é possível assinar.`);
  const id = idMatch[1];
  const xpath = `//*[local-name(.)='${nomeElemento}']`;

  const sig = new SignedXml({
    privateKey: certificado.chavePrivadaPem,
    publicCert: certificado.certificadoPem,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
  });

  sig.addReference({
    xpath,
    uri: `#${id}`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  });

  sig.computeSignature(xml, { location: { reference: xpath, action: "after" } });

  return sig.getSignedXml();
}

export function assinarDps(dpsXml: string): string {
  return assinarElemento(dpsXml, "infDPS");
}

/** Assina o pedido de registro de evento (ex.: cancelamento de NFS-e). */
export function assinarPedRegEvento(xml: string): string {
  return assinarElemento(xml, "infPedReg");
}

/** Auto-checagem offline: confirma que a assinatura produzida é válida, sem nenhuma chamada de rede. */
export function verificarAssinatura(xmlAssinado: string): boolean {
  const certificado = carregarCertificado();
  const sig = new SignedXml({ publicCert: certificado.certificadoPem });

  // A API do xml-crypto exige carregar o nó <Signature> separadamente do
  // documento antes de checkSignature() — não é feito implicitamente.
  const doc = new DOMParser().parseFromString(xmlAssinado);
  const [signatureNode] = sig.findSignatures(doc);
  if (!signatureNode) throw new Error("XML assinado sem elemento <Signature> — assinatura não foi aplicada.");
  sig.loadSignature(signatureNode);

  return sig.checkSignature(xmlAssinado);
}
