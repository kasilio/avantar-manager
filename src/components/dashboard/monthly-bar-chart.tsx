import { fmtMoney } from "@/lib/format";

export interface MonthlyBarChartPonto {
  periodo: string; // "YYYY-MM"
  valor: number;
}

const MESES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function labelPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split("-").map(Number);
  return `${MESES_ABREV[(mes ?? 1) - 1]}/${String(ano).slice(2)}`;
}

/** Barras verticais simples pra evolução mês a mês — sem lib de gráfico,
 * consistente com o resto do dashboard (ver RankingList). Valor sempre visível
 * na ponta de cada barra (rótulo direto em fluxo normal, não tooltip
 * posicionado — % de margin resolve contra a largura do container, não a
 * altura, então empurrar um tooltip com margin-bottom em % nunca fica no
 * lugar certo). */
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
    <div className="overflow-x-auto">
      <div className="flex min-w-fit items-end gap-3 sm:gap-4" style={{ height: 180 }}>
        {dados.map((d) => {
          const pct = maior > 0 ? Math.max((d.valor / maior) * 100, d.valor > 0 ? 4 : 1.5) : 1.5;
          return (
            <div key={d.periodo} className="flex h-full w-14 shrink-0 flex-col items-center justify-end gap-1.5">
              <span className="whitespace-nowrap text-[11px] font-semibold">{fmtMoney(d.valor)}</span>
              <div className={`w-full max-w-10 rounded-t-md ${corBarra}`} style={{ height: `${pct}%`, minHeight: 3 }} />
              <span className="text-[11px] capitalize text-muted-foreground">{labelPeriodo(d.periodo)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
