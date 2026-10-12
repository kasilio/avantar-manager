// Formatação compartilhada pelos módulos — equivalente TS das funções
// fmt()/fmtDate() do legacy/avantar-manager.html.

export function fmtMoney(value: number | null | undefined): string {
  return "R$ " + Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

export function shiftPeriodo(periodo: string, delta: number): string {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function mesLabel(periodo: string): string {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function diasNoMes(periodo: string): number {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function diaDoMes(dataIso: string): number {
  return Number(dataIso.slice(8, 10));
}

/** "DD/MM/YYYY" -> "YYYY-MM-DD". */
export function brDateToIso(d: string): string | null {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function fmtDateCurta(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y.slice(2)}`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

/** "Hoje" na data civil de Brasília (UTC-3, sem horário de verão desde
 * 2019), não em UTC puro — o servidor roda em UTC, então sem esse ajuste
 * "hoje" vira amanhã sempre que passa da meia-noite em UTC mas ainda não
 * passou da meia-noite em Brasília (todo dia, entre ~21h e meia-noite). */
export function today(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function periodoAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function daysUntilBirthday(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length < 3) return null;
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

  let aniv = new Date(anoAtual, mes, dia);
  const hojeNorm = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (aniv < hojeNorm) aniv = new Date(anoAtual + 1, mes, dia);

  return Math.round((aniv.getTime() - hojeNorm.getTime()) / (1000 * 60 * 60 * 24));
}
