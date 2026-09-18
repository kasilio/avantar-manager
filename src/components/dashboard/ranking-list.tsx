import { fmtMoney } from "@/lib/format";

export interface RankingItem {
  label: string;
  valor: number;
  sufixo?: string;
}

export function RankingList({ itens }: { itens: RankingItem[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados ainda.</p>;
  }
  const maior = Math.max(...itens.map((i) => i.valor));

  return (
    <div className="flex flex-col gap-3">
      {itens.map((item, i) => {
        const pct = maior > 0 ? Math.max((item.valor / maior) * 100, 4) : 0;
        return (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 truncate">
                <span className="text-xs text-muted-foreground">{i + 1}.</span>
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span className="shrink-0 font-medium">
                {item.sufixo ?? fmtMoney(item.valor)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
