export interface MonthlyBarChartPonto {
  periodo: string; // "YYYY-MM"
  valor: number;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split("-").map(Number);
  return `${MESES_ABREV[(mes ?? 1) - 1]}/${String(ano).slice(2)}`;
}

/** Versão compacta do valor pra caber ao lado de 11 irmãs sem estourar a
 * largura do card ("R$ 16k" em vez de "R$ 15.995,70") — a barra já mostra a
 * magnitude, o rótulo só precisa dar uma leitura rápida. */
function fmtMoneyCompacto(valor: number): string {
  const abs = Math.abs(valor);
  if (abs >= 1000) {
    return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  }
  return `R$ ${valor.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/** Barras verticais simples pra evolução mês a mês — sem lib de gráfico,
 * consistente com o resto do dashboard (ver RankingList). Largura flexível
 * (flex-1, sem overflow/scroll): todos os meses sempre cabem no card, só
 * ficam mais finos quando são muitos. Valor sempre visível na ponta de cada
 * barra (rótulo direto em fluxo normal, não tooltip posicionado). */
export function MonthlyBarChart({
  dados,
  cor = "primary",
}: {
  dados: MonthlyBarChartPonto[];
  cor?: "primary" | "success";
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  }

  const maior = Math.max(...dados.map((d) => d.valor), 0);
  const corBarra = cor === "success" ? "bg-success" : "bg-primary";

  return (
    <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: 180 }}>
      {dados.map((d) => {
        const pct = maior > 0 ? Math.max((d.valor / maior) * 100, d.valor > 0 ? 4 : 1.5) : 1.5;
        return (
          <div key={d.periodo} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="whitespace-nowrap text-[10px] font-semibold sm:text-[11px]">{fmtMoneyCompacto(d.valor)}</span>
            <div className={`w-full max-w-10 rounded-t-md ${corBarra}`} style={{ height: `${pct}%`, minHeight: 3 }} />
            <span className="whitespace-nowrap text-[10px] capitalize text-muted-foreground sm:text-[11px]">{labelPeriodo(d.periodo)}</span>
          </div>
        );
      })}
    </div>
  );
}
