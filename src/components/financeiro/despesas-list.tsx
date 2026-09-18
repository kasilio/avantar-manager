"use client";

import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { marcarDespesaPaga, reabrirDespesaPaga, deleteDespesa } from "@/app/(dashboard)/financeiro/actions";
import { DespesaDialogForm } from "./despesa-dialog-form";
import { updateDespesa } from "@/app/(dashboard)/financeiro/actions";
import type { Despesa } from "@/types/database";

function monthsBetween(periodoInicio: string, periodoAlvo: string): number {
  const [anoI, mesI] = periodoInicio.split("-").map(Number);
  const [anoA, mesA] = periodoAlvo.split("-").map(Number);
  return (anoA - anoI) * 12 + (mesA - mesI);
}

export function DespesasList({
  despesas,
  pagasNoMes,
  periodo,
  titulo,
  categoriasExistentes = [],
  permiteMarcarPago = true,
}: {
  despesas: Despesa[];
  pagasNoMes: Set<string>;
  periodo: string;
  titulo: string;
  categoriasExistentes?: string[];
  /** false em "Ver tudo"/intervalo: a lista mistura despesas de vários
   * períodos e não há um único `periodo` correto pra registrar o pagamento
   * (ver financeiro/page.tsx). */
  permiteMarcarPago?: boolean;
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
                className={cn("flex items-center gap-2", !permiteMarcarPago && "cursor-default")}
                disabled={!permiteMarcarPago}
                title={permiteMarcarPago ? undefined : "Marcar como pago só está disponível vendo um mês por vez"}
                onClick={() =>
                  permiteMarcarPago && (paga ? reabrirDespesaPaga(d.id, periodo) : marcarDespesaPaga(d.id, periodo))
                }
              >
                {paga ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}
                <span className="font-medium">{d.descricao}</span>
                {d.categoria && <span className="text-xs text-muted-foreground">({d.categoria})</span>}
                {permiteMarcarPago && d.tipo === "parcelada" && d.parcela_inicio && d.parcelas_total && (
                  <span className="text-xs text-muted-foreground">
                    {Math.min(d.parcelas_total, Math.max(1, monthsBetween(d.parcela_inicio, periodo) + 1))}/{d.parcelas_total}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{fmtMoney(d.valor)}</span>
                <DespesaDialogForm despesa={d} categoriasExistentes={categoriasExistentes} action={updateDespesa.bind(null, d.id)} />
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
