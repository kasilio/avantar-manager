import "server-only";
import { DOMParser } from "@xmldom/xmldom";
import { SignedXml } from "xml-crypto";
import { carregarCertificado } from "./certificado";

/**
 * Assinatura XMLDSig enveloped do elemento <infDPS>, inserida como
 * <Signature> logo depois dele — exatamente a estrutura exigida pelo XSD
 * oficial (TCDPS: sequence[infDPS, ds:Signature minOccurs=0], ver
 * DPS_v1.01.xsd/tiposComplexos_v1.01.xsd). Algoritmo (RSA-SHA256 + C14N
 * exclusivo) é o par padrão mais comum em documentos fiscais brasileiros
 * recentes (segue o mesmo perfil usado por NFe/CTe) — não está confirmado
 * contra um perfil ICP-Brasil específico da NFS-e Nacional; se a produção
 * restrita rejeitar a assinatura, é o primeiro ponto a revisar.
 */
export function assinarDps(dpsXml: string): string {
  const certificado = carregarCertificado();
  const idMatch = dpsXml.match(/<infDPS Id="([^"]+)"/);
  if (!idMatch) throw new Error("XML da DPS sem atributo Id em <infDPS> — não é possível assinar.");
  const id = idMatch[1];

  const sig = new SignedXml({
    privateKey: certificado.chavePrivadaPem,
    publicCert: certificado.certificadoPem,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
  });

  sig.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    uri: `#${id}`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
  });

  sig.computeSignature(dpsXml, {
    location: { reference: "//*[local-name(.)='infDPS']", action: "after" },
  });

  return sig.getSignedXml();
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
