"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { concluirFollowupCrm } from "@/app/(dashboard)/crm/actions";
import type { Cliente, Followup, Producao } from "@/types/database";

type FollowupRow = Followup & {
  producoes: (Pick<Producao, "id" | "num_apolice"> & { clientes: Pick<Cliente, "nome"> | null }) | null;
};

export function FollowupList({ followups }: { followups: FollowupRow[] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = followups.filter((f) => !f.concluido_em);
  const atrasados = pendentes.filter((f) => f.due_date < hoje);
  const proximos = pendentes.filter((f) => f.due_date >= hoje);

  if (pendentes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum follow-up pendente. 🎉
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {atrasados.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-destructive">Atrasados</h3>
          <div className="flex flex-col gap-2">
            {atrasados.map((f) => (
              <FollowupRowItem key={f.id} followup={f} />
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Próximos</h3>
        <div className="flex flex-col gap-2">
          {proximos.map((f) => (
            <FollowupRowItem key={f.id} followup={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FollowupRowItem({ followup: f }: { followup: FollowupRow }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasado = f.due_date < hoje;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm",
        atrasado && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-center gap-2">
        <Circle className="size-4 text-muted-foreground" />
        <div>
          <Link href={f.producoes ? `/producoes/${f.producoes.id}` : "#"} className="font-medium hover:text-primary">
            {f.producoes?.clientes?.nome ?? "Cliente"}
          </Link>
          <div className="text-xs text-muted-foreground">
            {f.motivo} — {fmtDate(f.due_date)}
          </div>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => concluirFollowupCrm(f.id)}
      >
        <CheckCircle2 className="size-4" /> Concluir
      </Button>
    </div>
  );
}
