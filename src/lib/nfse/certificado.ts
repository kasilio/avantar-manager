import "server-only";
import { Agent } from "node:https";
import forge from "node-forge";
import { nfseEnv } from "./env";

export type Certificado = {
  /** Chave privada em PEM — usada pra assinar o XML (XMLDSig, ver assinatura.ts) e pro mTLS. */
  chavePrivadaPem: string;
  /** Certificado (folha) em PEM — vai dentro do <X509Certificate> da assinatura e pro mTLS. */
  certificadoPem: string;
};

let cached: Certificado | null = null;

/**
 * Decodifica o certificado e-CNPJ A1 (.pfx) configurado via env e extrai a
 * chave privada + certificado em PEM via node-forge.
 *
 * Por que PEM e não o .pfx bruto num `https.Agent({ pfx, passphrase })`:
 * testado na prática contra este certificado real, o TLS nativo do Node
 * (OpenSSL 3) rejeita o .pfx com `Error: Unsupported PKCS12 PFX data` —
 * certificados ICP-Brasil A1 mais antigos costumam usar criptografia PKCS#12
 * legada (RC2/3DES) que o OpenSSL 3 desabilitou por padrão. O node-forge não
 * tem essa restrição e decodifica normalmente; a partir daí os PEMs
 * funcionam sem problema tanto pra assinatura quanto pro mTLS.
 */
export function carregarCertificado(): Certificado {
  if (cached) return cached;

  const env = nfseEnv();
  const pfxBuffer = Buffer.from(env.NFSE_CERTIFICADO_PFX_BASE64, "base64");

  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString("binary")));
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, env.NFSE_CERTIFICADO_SENHA);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) throw new Error("Certificado (.pfx) não contém um certificado X.509.");

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  if (!keyBag?.key) throw new Error("Certificado (.pfx) não contém uma chave privada.");

  cached = {
    chavePrivadaPem: forge.pki.privateKeyToPem(keyBag.key),
    certificadoPem: forge.pki.certificateToPem(certBag.cert),
  };
  return cached;
}

/** Agent HTTPS com autenticação mútua (mTLS) — exigida pela Sefin Nacional NFS-e em todas as chamadas. */
export function criarAgenteMtls(): Agent {
  const certificado = carregarCertificado();
  return new Agent({ key: certificado.chavePrivadaPem, cert: certificado.certificadoPem });
}
