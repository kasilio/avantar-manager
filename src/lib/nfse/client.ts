import "server-only";
import { request } from "node:https";
import { criarAgenteMtls } from "./certificado";
import { gzipBase64, ungzipBase64 } from "./gzip";
import type { AmbienteNfse } from "@/types/database";

/**
 * Hosts confirmados em
 * https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
 * e no próprio spec OpenAPI servido por eles (host/basePath). Infraestrutura
 * pública fixa — não precisa virar env var, só muda pelo switch de ambiente.
 */
function hostSefin(ambiente: AmbienteNfse): string {
  return ambiente === "producao" ? "sefin.nfse.gov.br" : "sefin.producaorestrita.nfse.gov.br";
}

// A doc do swagger documenta minúsculo (codigo/descricao/complemento), mas
// uma rejeição real em produção restrita voltou com PascalCase
// (Codigo/Descricao) — a doc está errada nisso, o runtime manda maiúsculo.
type MensagemProcessamento = { Codigo?: string; Descricao?: string; Complemento?: string };

type NFSePostResponseSucesso = {
  tipoAmbiente: number;
  versaoAplicativo: string;
  dataHoraProcessamento: string;
  idDps: string;
  chaveAcesso: string;
  nfseXmlGZipB64: string;
  alertas?: MensagemProcessamento[];
};

type NFSePostResponseErro = {
  tipoAmbiente: number;
  versaoAplicativo: string;
  dataHoraProcessamento: string;
  idDPS?: string;
  erros: MensagemProcessamento[];
};

export type ResultadoEnvioDps =
  | {
      autorizado: true;
      chaveAcesso: string;
      numeroNfse: string | null;
      nfseXml: string;
      payloadResposta: Record<string, unknown>;
    }
  | { autorizado: false; motivoRejeicao: string; payloadResposta: Record<string, unknown> };

/** Erro de transporte/infraestrutura (rede, TLS, HTTP 500) — distinto de uma
 * rejeição de negócio (DPS inválida, HTTP 400/403), que vira o branch
 * `autorizado: false` do retorno em vez de lançar. */
export class NfseErroTransporteError extends Error {}

function extrairNumeroNfse(nfseXml: string): string | null {
  const m = nfseXml.match(/<nNFSe>(\d+)<\/nNFSe>/);
  return m ? m[1] : null;
}

function formatarMensagens(mensagens: MensagemProcessamento[] | undefined): string {
  if (!mensagens || mensagens.length === 0) return "Sem detalhe retornado pelo governo.";
  return mensagens.map((m) => [m.Codigo, m.Descricao, m.Complemento].filter(Boolean).join(" — ")).join("; ");
}

/**
 * POST /nfse — recepção síncrona da DPS, conforme o spec OpenAPI oficial
 * obtido via mTLS em
 * https://sefin.producaorestrita.nfse.gov.br/SefinNacional/swagger/docs/v1
 * (protocolo: TLS com autenticação mútua; mensagens em JSON; XML da DPS
 * compactado em GZip + base64 no campo `dpsXmlGZipB64`).
 */
export async function enviarDps(dpsXmlAssinado: string, ambiente: AmbienteNfse): Promise<ResultadoEnvioDps> {
  const agent = criarAgenteMtls();
  const host = hostSefin(ambiente);
  const body = JSON.stringify({ dpsXmlGZipB64: gzipBase64(dpsXmlAssinado) });

  const { status, json } = await new Promise<{ status: number; json: unknown }>((resolve, reject) => {
    const req = request(
      {
        agent,
        host,
        path: "/SefinNacional/nfse",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
        timeout: 30_000,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, json: raw ? JSON.parse(raw) : null });
          } catch {
            reject(new NfseErroTransporteError(`Resposta inesperada da Sefin Nacional (HTTP ${res.statusCode}): ${raw.slice(0, 500)}`));
          }
        });
      },
    );
    req.on("error", (err) => reject(new NfseErroTransporteError(`Falha de rede/TLS ao transmitir a NFS-e: ${err.message}`)));
    req.on("timeout", () => {
      req.destroy();
      reject(new NfseErroTransporteError("Timeout ao transmitir a NFS-e (30s)."));
    });
    req.write(body);
    req.end();
  });

  if (status === 201) {
    const sucesso = json as NFSePostResponseSucesso;
    const nfseXml = ungzipBase64(sucesso.nfseXmlGZipB64);
    return {
      autorizado: true,
      chaveAcesso: sucesso.chaveAcesso,
      numeroNfse: extrairNumeroNfse(nfseXml),
      nfseXml,
      payloadResposta: json as Record<string, unknown>,
    };
  }

  if (status === 400 || status === 403) {
    const erro = json as NFSePostResponseErro;
    return {
      autorizado: false,
      motivoRejeicao: formatarMensagens(erro.erros),
      payloadResposta: json as Record<string, unknown>,
    };
  }

  const erro = json as NFSePostResponseErro | null;
  throw new NfseErroTransporteError(
    `Falha ao processar o DPS na Sefin Nacional (HTTP ${status}): ${formatarMensagens(erro?.erros)}`,
  );
}
