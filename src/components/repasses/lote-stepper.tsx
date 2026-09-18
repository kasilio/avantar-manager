import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import type { StatusRepasse } from "@/types/database";

const ORDEM: StatusRepasse[] = ["aguardando_nf", "aguardando_pagamento", "pago"];

const PASSOS: { status: StatusRepasse; label: string }[] = [
  { status: "aguardando_nf", label: "Aguardando NF" },
  { status: "aguardando_pagamento", label: "Aguardando pagamento" },
  { status: "pago", label: "Concluído" },
];

export function LoteStepper({ status, criadoEm }: { status: StatusRepasse; criadoEm: string }) {
  const indiceAtual = ORDEM.indexOf(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Passo done label="Repasse cadastrado" sub={fmtDate(criadoEm)} />
      <Conector />
      {PASSOS.map((passo, i) => (
        <Fragment key={passo.status}>
          <Passo done={i < indiceAtual} active={i === indiceAtual} label={passo.label} />
          {i < PASSOS.length - 1 && <Conector />}
        </Fragment>
      ))}
    </div>
  );
}

function Conector() {
  return <span className="h-px w-4 shrink-0 bg-border" />;
}

function Passo({
  done,
  active,
  label,
  sub,
}: {
  done: boolean;
  active?: boolean;
  label: string;
  sub?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        done && "border-success/30 bg-success/15 text-success",
        active && "border-info/30 bg-info/15 text-info",
        !done && !active && "border-border bg-muted text-muted-foreground"
      )}
    >
      {done ? <Check className="size-3.5" /> : null}
      {label}
      {sub && <span className="font-normal opacity-70">· {sub}</span>}
    </div>
  );
}
