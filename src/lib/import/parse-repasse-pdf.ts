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

/** Linha da caixa "Outros Lançamentos" — crédito/débito avulso do lote, sem
 * apólice/produção associada (ex. desconto lançado na comissão do produtor
 * por causa de uma apólice de outro ramo). */
export interface RepasseLancamentoAvulsoParsed {
  creditoDebitoId: string;
  data: string | null;
  documento: string;
  descricao: string;
  corretora: string;
  valor: number;
}

export interface RepasseRelatorioParsed {
  arquivo: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  produtor: string | null;
  comissaoBrutaTotal: number | null;
  creditoDebitoTotal: number | null;
  linhas: RepasseLinhaParsed[];
  linhasIgnoradas: number;
  somaLinhas: number;
  totalConfere: boolean | null;
  lancamentosAvulsos: RepasseLancamentoAvulsoParsed[];
  somaLancamentosAvulsos: number;
  lancamentosAvulsosConferem: boolean | null;
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

  // Companhia é texto livre e pode vir em mais de um item quando o nome tem
  // mais de uma palavra (ex. "ALIRO SEGUROS") — palavras lado a lado na mesma
  // linha não são mescladas pela heurística de merge vertical acima. Por
  // isso os 5 campos fixos depois dela (Repasse/Prêmio/%Apólice/%Repasse/
  // Comissão) são lidos de trás pra frente, e tudo que sobra vira companhia.
  const tail = vals.slice(cursor);
  if (tail.length < 6) return null;
  const comissaoRaw = tail[tail.length - 1];
  const repassePctRaw = tail[tail.length - 2];
  const apolicePctRaw = tail[tail.length - 3];
  const premioRaw = tail[tail.length - 4];
  // tail[tail.length - 5] = "Repasse" (forma, ex. "NR | CC") — não usado no schema atual
  const companhia = tail.slice(0, tail.length - 5).join(" ");

  if (!companhia || !/%$/.test(apolicePctRaw) || !/%$/.test(repassePctRaw) || !/^R\$/.test(comissaoRaw)) {
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

type LancamentoColuna = "id" | "data" | "documento" | "descricao" | "corretora" | "valor";

const LANCAMENTO_HEADER_LABELS: Record<string, LancamentoColuna> = {
  "Credito /": "id",
  "Debito Id": "id",
  Data: "data",
  Documento: "documento",
  Descrição: "descricao",
  Corretora: "corretora",
  Valor: "valor",
};

/** A caixa "Outros Lançamentos" tem 3 colunas de texto livre em sequência
 * (Documento/Descrição/Corretora) — a mesma técnica sequencial do parseRow
 * principal não dá conta disso (não dá pra saber onde um campo termina e o
 * próximo começa só pela ordem). Em vez disso, classifica cada item pela
 * coluna (x) mais próxima dos rótulos do cabeçalho dessa caixa, o que
 * também resolve de graça o caso de "Documento" quebrar em várias linhas
 * (ex. "AGROFRUTAS\nCOMERCIO DE\nFRUTAS") — todas as linhas caem na mesma
 * coluna, só mudam de y. */
function parseLancamentosAvulsos(
  allItems: Item[],
  outrosLancamentosItem: Item | undefined,
  legendaTopoItem: Item | undefined
): RepasseLancamentoAvulsoParsed[] {
  if (!outrosLancamentosItem) return [];

  const boxItems = allItems.filter((it) => {
    if (it.y >= outrosLancamentosItem.y) return false;
    if (legendaTopoItem && it.y <= legendaTopoItem.y) return false;
    return true;
  });

  const headerEntries = boxItems
    .map((it) => ({ it, col: LANCAMENTO_HEADER_LABELS[it.str.trim()] }))
    .filter((e): e is { it: Item; col: LancamentoColuna } => !!e.col);
  if (headerEntries.length === 0) return [];

  const colXSum = new Map<LancamentoColuna, { sum: number; n: number }>();
  for (const { it, col } of headerEntries) {
    const acc = colXSum.get(col) ?? { sum: 0, n: 0 };
    acc.sum += it.x;
    acc.n += 1;
    colXSum.set(col, acc);
  }
  const colAnchors = [...colXSum.entries()].map(([col, { sum, n }]) => ({ col, x: sum / n }));
  if (colAnchors.length < 6) return [];

  const headerBottomY = Math.min(...headerEntries.map((e) => e.it.y));
  const bodyItems = boxItems.filter((it) => it.y < headerBottomY);

  const idAnchor = colAnchors.find((c) => c.col === "id")!;
  const baselines = [
    ...new Set(
      bodyItems.filter((it) => /^\d+$/.test(it.str.trim()) && Math.abs(it.x - idAnchor.x) < 40).map((it) => it.y)
    ),
  ].sort((a, b) => b - a);
  if (baselines.length === 0) return [];

  function nearestBaseline(y: number): number {
    let best = baselines[0];
    let bestDist = Math.abs(y - best);
    for (const b of baselines) {
      const d = Math.abs(y - b);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  function nearestColuna(x: number): LancamentoColuna {
    let best = colAnchors[0];
    let bestDist = Math.abs(x - best.x);
    for (const c of colAnchors) {
      const d = Math.abs(x - c.x);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best.col;
  }

  const rows = new Map<number, Record<LancamentoColuna, Item[]>>();
  for (const y of baselines) rows.set(y, { id: [], data: [], documento: [], descricao: [], corretora: [], valor: [] });

  for (const it of bodyItems) {
    rows.get(nearestBaseline(it.y))![nearestColuna(it.x)].push(it);
  }

  function joinColuna(col: Item[]): string {
    return col
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((it) => it.str.trim())
      .filter(Boolean)
      .join(" ");
  }

  const resultado: RepasseLancamentoAvulsoParsed[] = [];
  for (const y of baselines) {
    const row = rows.get(y)!;
    const creditoDebitoId = joinColuna(row.id);
    if (!/^\d+$/.test(creditoDebitoId)) continue;
    const dataRaw = joinColuna(row.data);
    const valorRaw = joinColuna(row.valor);
    const valor = parseMoney(valorRaw);
    if (valor === null) continue;

    resultado.push({
      creditoDebitoId,
      data: /^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw) ? dataRaw : null,
      documento: joinColuna(row.documento),
      descricao: joinColuna(row.descricao),
      corretora: joinColuna(row.corretora),
      valor,
    });
  }
  return resultado;
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
  let creditoDebitoTotal: number | null = null;
  if (produtorItem) {
    const rowMoney = allItems
      .filter((it) => Math.abs(it.y - produtorItem.y) < 3 && /^R\$/.test(it.str.trim()))
      .sort((a, b) => a.x - b.x)
      .map((it) => parseMoney(it.str.trim()));
    // Linha normal: [Comissão Bruta, Impostos, Créd./Déb., Comissão Líquida]
    // (4 valores em R$). Quando o relatório inclui a coluna extra "Total
    // Prêmio Parcela" (visto no relatório de set/2026), ela entra na frente
    // e vira 5 valores, com Comissão Bruta no índice 1.
    if (rowMoney.length === 4) {
      comissaoBrutaTotal = rowMoney[0];
      creditoDebitoTotal = rowMoney[2];
    } else if (rowMoney.length === 5) {
      comissaoBrutaTotal = rowMoney[1];
      creditoDebitoTotal = rowMoney[3];
    }
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

  // A caixa "Outros Lançamentos" (créditos/débitos avulsos, ex. descontos por
  // apólice de outro ramo) fica entre a tabela de Repasses e a Legenda — ou
  // seja, dentro da mesma faixa vertical que o corte acima deixaria passar.
  // Sem excluir essa caixa, o texto dela (datas, descrição, etc.) acaba
  // grudando na linha de Repasses mais próxima e quebrando o parsing dela.
  const outrosLancamentosItem = allItems.find((it) => it.str.trim() === "Outros Lançamentos");

  const tableItems = allItems.filter((it) => {
    if (headerBottomY !== null && it.y >= headerBottomY) return false;
    if (legendaTopoItem && it.y <= legendaTopoItem.y) return false;
    if (outrosLancamentosItem && it.y <= outrosLancamentosItem.y) return false;
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

  const lancamentosAvulsos = parseLancamentosAvulsos(allItems, outrosLancamentosItem, legendaTopoItem);
  const somaLancamentosAvulsos = Math.round(lancamentosAvulsos.reduce((sum, l) => sum + l.valor, 0) * 100) / 100;
  const lancamentosAvulsosConferem =
    creditoDebitoTotal === null ? null : Math.abs(somaLancamentosAvulsos - creditoDebitoTotal) < 0.02;

  return {
    arquivo,
    periodoInicio,
    periodoFim,
    produtor,
    comissaoBrutaTotal,
    creditoDebitoTotal,
    linhas,
    linhasIgnoradas,
    somaLinhas,
    totalConfere,
    lancamentosAvulsos,
    somaLancamentosAvulsos,
    lancamentosAvulsosConferem,
  };
}

export function periodoAaaaMm(relatorio: RepasseRelatorioParsed): string | null {
  return periodoParaMes(relatorio.periodoInicio);
}
