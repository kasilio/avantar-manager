"use client";

import Link from "next/link";
import { Check, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { toggleTarefa, deleteTarefa } from "@/app/(dashboard)/tarefas/actions";
import type { VirtualTarefa } from "@/lib/tarefas";

const TIPO_LABEL: Record<VirtualTarefa["tipo"], string> = {
  manual: "Tarefa",
  followup: "Follow-up",
  despesa: "Despesa",
  aniversario: "Aniversário",
};

function Item({ t }: { t: VirtualTarefa }) {
  const content = (
    <div className={cn("flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm", t.concluida && "opacity-50")}>
      {t.tipo === "manual" ? (
        <Checkbox
          checked={t.concluida}
          onCheckedChange={(checked) => toggleTarefa(t.id.replace("manual_", ""), checked === true)}
        />
      ) : (
        <Check className="size-4 text-transparent" />
      )}
      <div className="flex-1">
        <div className="font-medium">{t.titulo}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {t.subtitulo && <span>{t.subtitulo}</span>}
          <Badge variant="outline" className="text-[10px]">{TIPO_LABEL[t.tipo]}</Badge>
          <span>{fmtDate(t.data)}</span>
        </div>
      </div>
      {t.tipo === "manual" && (
        <button
          type="button"
          onClick={() => deleteTarefa(t.id.replace("manual_", ""))}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );

  return t.href ? (
    <Link href={t.href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

export function TarefaQuadro({ tarefas }: { tarefas: VirtualTarefa[] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida);
  const vencidas = pendentes.filter((t) => t.data < hoje);
  const deHoje = pendentes.filter((t) => t.data === hoje);
  const proximas = pendentes.filter((t) => t.data > hoje);

  const sections: [string, VirtualTarefa[]][] = [
    ["Vencidas", vencidas],
    ["Hoje", deHoje],
    ["Próximas", proximas],
    ["Concluídas", concluidas],
  ];

  return (
    <div className="flex flex-col gap-6">
      {sections.map(([label, items]) => (
        <div key={label}>
          <h3 className={cn("mb-2 text-sm font-semibold", label === "Vencidas" && items.length > 0 && "text-destructive")}>
            {label} ({items.length})
          </h3>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nada por aqui.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((t) => (
                <Item key={t.id} t={t} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
