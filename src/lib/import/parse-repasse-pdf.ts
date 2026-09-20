import "server-only";
import { loadPdfjs } from "./pdfjs";

// Parser sob medida pro relatório "PRP01 - Previsão Repasses a pagar" do
// SGCOR (sistema da matriz/Avantar). Usa pdfjs-dist pra ler cada item de
// texto com posição (x, y) — mais robusto que regex sobre texto corrido,
// porque "Segurado"/"Apólice" são campos livres com espaços internos, e o
// nome da seguradora às vezes quebra em duas linhas (ex. "JUSTOS\nSEGUROS").
// Ver plano em C:\Users\NB020\.claude\plans\cuddly-puzzling-wreath.md pro
// raciocínio completo por trás do algoritmo.

export interface RepasseLinhaParsed {
  propostaId: string;
  apoliceEndosso: string;
  segurado: string;
  parcelaId: string;
  parcela: string;
  ramo: string;
  companhia: string;
  premioParcela: number | null;
  apolicePct: number;
  repassePct: number;
  comissao: number;
}

export interface RepasseRelatorioParsed {
  arquivo: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  produtor: string | null;
  comissaoBrutaTotal: number | null;
  linhas: RepasseLinhaParsed[];
  linhasIgnoradas: number;
  somaLinhas: number;
  totalConfere: boolean | null;
}

interface Item {
  str: string;
  x: number;
  y: number;
}

function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePct(raw: string): number {
  const n = Number(raw.replace("%", "").trim().replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Agrupa os itens da tabela em linhas, usando o "Proposta Id" (dígitos na
 * coluna mais à esquerda) como âncora de cada linha, e junta sub-itens que
 * quebraram em duas linhas verticalmente (mesmo x, y próximo) — caso da
 * Companhia às vezes. */
function groupRows(items: Item[]): Item[][] {
  const baselines = items
    .filter((it) => /^\d+$/.test(it.str) && it.x < 60)
    .map((it) => it.y)
    .sort((a, b) => b - a);
  if (baselines.length === 0) return [];

  const rows = new Map<number, Item[]>();
  for (const y of baselines) rows.set(y, []);

  for (const it of items) {
    let nearest = baselines[0];
    let best = Math.abs(it.y - nearest);
    for (const y of baselines) {
      const d = Math.abs(it.y - y);
      if (d < best) {
        best = d;
        nearest = y;
      }
    }
    rows.get(nearest)!.push(it);
  }

  return baselines.map((y) => {
    const sorted = rows.get(y)!.sort((a, b) => a.x - b.x || b.y - a.y);
    const merged: Item[] = [];
    for (const it of sorted) {
      const prev = merged[merged.length - 1];
      if (prev && Math.abs(prev.x - it.x) < 3) {
        prev.str = `${prev.str} ${it.str}`;
      } else {
        merged.push({ ...it });
      }
    }
    return merged;
  });
}

function parseRow(items: Item[]): RepasseLinhaParsed | null {
  const vals = items.map((it) => it.str.trim()).filter(Boolean);
  if (vals.length < 8) return null;

  const propostaId = vals[0];
  if (!/^\d+$/.test(propostaId)) return null;

  const parcelaRamoIdx = vals.findIndex((v, i) => i > 0 && /^\d+\/\d+/.test(v));
  if (parcelaRamoIdx < 2) return null;
  const parcelaId = vals[parcelaRamoIdx - 1];
  if (!/^\d+$/.test(parcelaId)) return null;

  const meio = vals.slice(1, parcelaRamoIdx - 1);
  if (meio.length < 1) return null;
  const segurado = meio[meio.length - 1];
  const apoliceEndosso = meio.slice(0, -1).join(" ") || segurado;

  let cursor = parcelaRamoIdx;
  const parcelaRamoMatch = vals[cursor].match(/^(\d+\/\d+)\s*(.*)$/);
  if (!parcelaRamoMatch) return null;
  const parcela = parcelaRamoMatch[1];
  let ramo = parcelaRamoMatch[2].trim();
  cursor++;
  if (!ramo) {
    ramo = vals[cursor] ?? "";
    cursor++;
  }

  const companhia = vals[cursor++] ?? "";
  cursor++; // "Repasse" (forma, ex. "NR | CC") — não usado no schema atual
  const premioRaw = vals[cursor++] ?? "";
  const apolicePctRaw = vals[cursor++] ?? "";
  const repassePctRaw = vals[cursor++] ?? "";
  const comissaoRaw = vals[cursor++] ?? "";

  if (!/%$/.test(apolicePctRaw) || !/%$/.test(repassePctRaw) || !/^R\$/.test(comissaoRaw)) {
    return null;
  }

  const comissao = parseMoney(comissaoRaw);
  if (comissao === null) return null;

  return {
    propostaId,
    apoliceEndosso,
    segurado,
    parcelaId,
    parcela,
    ramo,
    companhia,
    premioParcela: premioRaw === "-" || premioRaw === "" ? null : parseMoney(premioRaw),
    apolicePct: parsePct(apolicePctRaw),
    repassePct: parsePct(repassePctRaw),
    comissao,
  };
}

function periodoParaMes(periodoInicio: string | null): string | null {
  if (!periodoInicio) return null;
  const m = periodoInicio.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}`;
}

export async function parseRepassePdf(data: Uint8Array, arquivo: string): Promise<RepasseRelatorioParsed> {
  const pdfjsLib = await loadPdfjs();
  const doc = await pdfjsLib.getDocument({ data, useWorkerFetch: false }).promise;

  const allItems: Item[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      const item = raw as { str?: string; transform?: number[] };
      if (!item.str || !item.str.trim() || !item.transform) continue;
      allItems.push({ str: item.str, x: item.transform[4], y: item.transform[5] });
    }
  }

  const fullText = allItems.map((it) => it.str).join(" ");
  const periodoMatch = fullText.match(/(\d{2}\/\d{2}\/\d{4})\s*á\s*(\d{2}\/\d{2}\/\d{4})/);
  const periodoInicio = periodoMatch?.[1] ?? null;
  const periodoFim = periodoMatch?.[2] ?? null;

  const produtorItem = allItems.find((it) => /^MATHEUS\b/i.test(it.str.trim()));
  const produtor = produtorItem?.str.trim() ?? null;

  let comissaoBrutaTotal: number | null = null;
  if (produtorItem) {
    const rowMoney = allItems
      .filter((it) => Math.abs(it.y - produtorItem.y) < 3 && /^R\$/.test(it.str.trim()))
      .sort((a, b) => a.x - b.x)
      .map((it) => parseMoney(it.str.trim()));
    // Linha normal: [Comissão Bruta, Impostos, Créd./Déb., Comissão Líquida]
    // (4 valores em R$). Quando o relatório inclui a coluna extra "Total
    // Prêmio Parcela" (visto no relatório de set/2026), ela entra na frente
    // e vira 5 valores, com Comissão Bruta no índice 1.
    if (rowMoney.length === 4) comissaoBrutaTotal = rowMoney[0];
    else if (rowMoney.length === 5) comissaoBrutaTotal = rowMoney[1];
  }

  // O cabeçalho da tabela é de duas linhas ("Parcela" com "Id"/"Nº" como
  // sub-rótulos embaixo) — o sub-rótulo "Id" fica abaixo até do rótulo
  // "Proposta Id", então o corte de topo usa o y mínimo entre todos os
  // rótulos de coluna conhecidos, não só "Proposta Id".
  const HEADER_LABELS = new Set([
    "Proposta Id",
    "Apólice / Endosso",
    "Certificado",
    "Segurado",
    "Parcela",
    "Id",
    "Nº",
    "Ramo",
    "Companhia",
    "Repasse",
    "Prêmio Parcela",
    "% Apólice",
    "% Repasse",
    "Comissão",
  ]);
  const headerYs = allItems.filter((it) => HEADER_LABELS.has(it.str.trim())).map((it) => it.y);
  const headerBottomY = headerYs.length > 0 ? Math.min(...headerYs) : null;

  // A "Legenda" fica numa caixa de duas linhas ("Formas Repasse:" em cima,
  // "Repasse Sobre:" embaixo) com o rótulo "Legenda" centralizado entre
  // elas — ou seja, ele fica ABAIXO do topo real da caixa. O corte de base
  // usa o y de "Formas Repasse:" (o texto mais alto da caixa).
  const legendaTopoItem = allItems.find((it) => it.str.trim() === "Formas Repasse:") ?? allItems.find((it) => it.str.trim() === "Legenda");
  const tableItems = allItems.filter((it) => {
    if (headerBottomY !== null && it.y >= headerBottomY) return false;
    if (legendaTopoItem && it.y <= legendaTopoItem.y) return false;
    return true;
  });

  const rows = groupRows(tableItems);
  const linhas: RepasseLinhaParsed[] = [];
  let linhasIgnoradas = 0;
  for (const row of rows) {
    const parsed = parseRow(row);
    if (parsed) linhas.push(parsed);
    else linhasIgnoradas++;
  }

  const somaLinhas = Math.round(linhas.reduce((sum, l) => sum + l.comissao, 0) * 100) / 100;
  const totalConfere =
    comissaoBrutaTotal === null ? null : Math.abs(somaLinhas - comissaoBrutaTotal) < 0.02;

  return {
    arquivo,
    periodoInicio,
    periodoFim,
    produtor,
    comissaoBrutaTotal,
    linhas,
    linhasIgnoradas,
    somaLinhas,
    totalConfere,
  };
}

export function periodoAaaaMm(relatorio: RepasseRelatorioParsed): string | null {
  return periodoParaMes(relatorio.periodoInicio);
}
