import "server-only";

// Parser da DANFSe (NFS-e nacional). O rótulo/valor é fixo em qualquer
// município desde a unificação nacional, então dá pra ler por regex sobre o
// texto corrido (diferente do relatório de repasse, que é tabular e precisa
// de posição x/y) — mas o layout já mudou de versão (v1.0 usa "Número da
// NFS-e", v2.0 usa "NÚMERO DA NFS-e" — só a caixa muda, daí o `i` nas
// regexes) e as primeiras notas emitidas (nº 1-3) nem têm rótulo selecionável
// (template antigo, só os valores como texto) — para essas cai num fallback
// posicional âncorado em "...portal nacional da NFS-e".

export interface NfParsed {
  numero: string | null;
  competencia: string | null; // "DD/MM/YYYY"
  valor: number | null;
  periodoRelatorio: { inicio: string; fim: string } | null; // extraído da descrição do serviço, quando presente
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function parseNfPdf(data: Uint8Array): Promise<NfParsed> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
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

  let numero = fullText.match(/N[uú]mero da NFS-e\s+(\d+)/i)?.[1] ?? null;
  let competencia = fullText.match(/Compet[eê]ncia da NFS-e\s+(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null;
  const valorMatch = fullText.match(/Valor L[ií]quido da NFS-e\s+R\$\s*([\d.,]+)/i);
  let valor = valorMatch ? parseMoney(valorMatch[1]) : null;

  // Fallback pras primeiras notas emitidas, sem rótulo selecionável: logo
  // depois de "...portal nacional da NFS-e" vem [número] [data de competência].
  if (!numero || !competencia) {
    const posicional = fullText.match(/portal nacional da NFS-e\s+(\d+)\s+(\d{2}\/\d{2}\/\d{4})/i);
    numero ??= posicional?.[1] ?? null;
    competencia ??= posicional?.[2] ?? null;
  }
  if (valor === null) {
    const primeiroValor = fullText.match(/R\$\s*([\d.,]+)/);
    valor = primeiroValor ? parseMoney(primeiroValor[1]) : null;
  }

  const periodoMatch = fullText.match(/per[ií]odo:?\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i);

  return {
    numero,
    competencia,
    valor,
    periodoRelatorio: periodoMatch ? { inicio: periodoMatch[1], fim: periodoMatch[2] } : null,
  };
}
