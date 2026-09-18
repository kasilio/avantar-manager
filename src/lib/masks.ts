// Máscaras de digitação — equivalente TS de formatMoney/parseMoney/
// formatCNPJ/formatCPF/formatCEP do legacy/avantar-manager.html.

export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

/** Dia do mês (1-31), só dígitos, no máximo 2 e nunca passa de 31. */
export function maskDiaVencimento(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 2);
  if (d === "") return d;
  return parseInt(d, 10) > 31 ? "31" : d;
}

export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim().replace(/-$/, "");
}

/** Centavos (inteiro) -> "1.234,56" pra exibir no input de dinheiro. */
export function centsToMoneyDisplay(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "1.234,56" (ou qualquer string com dígitos) -> número em reais. */
export function parseMoneyDisplay(display: string): number {
  const digits = display.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : 0;
}

/** Reformata o valor do input a cada tecla digitada, tipo caixa eletrônico. */
export function maskMoneyInput(rawDigits: string): { display: string; value: number } {
  const digits = rawDigits.replace(/\D/g, "");
  const cents = digits ? parseInt(digits, 10) : 0;
  return { display: centsToMoneyDisplay(cents), value: cents / 100 };
}
