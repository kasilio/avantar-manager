"use client";

import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { marcarDespesaPaga, reabrirDespesaPaga, deleteDespesa } from "@/app/(dashboard)/financeiro/actions";
import { DespesaDialogForm } from "./despesa-dialog-form";
import { updateDespesa } from "@/app/(dashboard)/financeiro/actions";
import type { Despesa } from "@/types/database";

export function DespesasList({
  despesas,
  pagasNoMes,
  periodo,
  titulo,
}: {
  despesas: Despesa[];
  pagasNoMes: Set<string>;
  periodo: string;
  titulo: string;
}) {
  if (despesas.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{titulo}</h3>
      <div className="flex flex-col gap-2">
        {despesas.map((d) => {
          const paga = pagasNoMes.has(d.id);
          return (
            <div
              key={d.id}
              className={cn("flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm", paga && "opacity-60")}
            >
              <button
                type="button"
                className="flex items-center gap-2"
                onClick={() =>
                  paga ? reabrirDespesaPaga(d.id, periodo) : marcarDespesaPaga(d.id, periodo)
                }
              >
                {paga ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className="font-medium">{d.descricao}</span>
                {d.categoria && <span className="text-xs text-muted-foreground">({d.categoria})</span>}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{fmtMoney(d.valor)}</span>
                <DespesaDialogForm despesa={d} action={updateDespesa.bind(null, d.id)} />
                <button type="button" onClick={() => deleteDespesa(d.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
