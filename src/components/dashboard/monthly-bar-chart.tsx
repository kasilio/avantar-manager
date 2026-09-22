"use client";

import { useState } from "react";
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

/** Barras verticais simples pra evolução mês a mês — sem libs de gráfico,
 * consistente com o resto do dashboard (ver RankingList). Uma série só, tooltip
 * no hover, último mês com rótulo direto (âncora de escala). */
export function MonthlyBarChart({
  dados,
  cor = "primary",
}: {
  dados: MonthlyBarChartPonto[];
  cor?: "primary" | "success";
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  }

  const maior = Math.max(...dados.map((d) => d.valor), 0);
  const corBarra = cor === "success" ? "bg-success" : "bg-primary";
  const corTexto = cor === "success" ? "text-success" : "text-primary";
  const ultimoIdx = dados.length - 1;

  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: 160 }}>
      {dados.map((d, i) => {
        const pct = maior > 0 ? Math.max((d.valor / maior) * 100, d.valor > 0 ? 4 : 1.5) : 1.5;
        const destaque = hoverIdx === i || (hoverIdx === null && i === ultimoIdx);
        return (
          <div
            key={d.periodo}
            className="relative flex flex-1 flex-col items-center justify-end gap-1.5"
            style={{ height: "100%" }}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {destaque && (
              <div
                className={`pointer-events-none absolute bottom-full mb-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium shadow-md ${corTexto}`}
                style={{ marginBottom: `calc(${pct}% + 4px)` }}
              >
                {fmtMoney(d.valor)}
              </div>
            )}
            <div
              className={`w-full max-w-10 rounded-t-md transition-opacity ${corBarra} ${
                hoverIdx !== null && !destaque ? "opacity-40" : "opacity-100"
              }`}
              style={{ height: `${pct}%`, minHeight: 3 }}
            />
            <span className="text-[11px] capitalize text-muted-foreground">{labelPeriodo(d.periodo)}</span>
          </div>
        );
      })}
    </div>
  );
}
