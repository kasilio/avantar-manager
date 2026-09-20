import "server-only";
import { loadPdfjs } from "./pdfjs";

// Leitura best-effort do DAS (Documento de Arrecadação do Simples Nacional) —
// layout padrão da Receita Federal, mas nunca testado contra um PDF real
// (só uma captura de tela até agora), então isso só PRÉ-PREENCHE os campos
// do fechamento — o usuário sempre confirma/edita antes de salvar, nunca
// bloqueia o fechamento por falha de leitura (ver `anexarDas` em actions.ts).

export interface DasParsed {
  numeroDocumento: string | null;
  vencimento: string | null; // "DD/MM/YYYY"
  valor: number | null;
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function parseDasPdf(data: Uint8Array): Promise<DasParsed> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

  const partes: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      const str = (raw as { str?: string }).str;
      if (str) partes.push(str);
    }
  }
  const fullText = partes.join(" ");

  const numeroDocumento = fullText.match(/N[uú]mero do Documento\s+([\d.\-]+)/i)?.[1] ?? null;
  const vencimento = fullText.match(/(?:Data de Vencimento|Pagar este documento at[ée])\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  const valorMatch = fullText.match(/Valor Total do Documento\s+([\d.,]+)/i);

  return {
    numeroDocumento,
    vencimento,
    valor: valorMatch ? parseMoney(valorMatch[1]) : null,
  };
}
