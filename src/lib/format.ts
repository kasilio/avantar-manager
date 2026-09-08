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

export function fmtPct(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
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
