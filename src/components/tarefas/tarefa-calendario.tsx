"use client";

import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { TarefaQuadro } from "./tarefa-quadro";
import type { VirtualTarefa } from "@/lib/tarefas";

function parseLocalDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function TarefaCalendario({ tarefas }: { tarefas: VirtualTarefa[] }) {
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const diasComTarefa = useMemo(() => tarefas.map((t) => parseLocalDate(t.data)), [tarefas]);

  const tarefasDoDia = useMemo(() => {
    if (!selected) return [];
    const iso = selected.toISOString().slice(0, 10);
    return tarefas.filter((t) => t.data === iso);
  }, [tarefas, selected]);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <Card className="w-fit">
        <CardContent className="p-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{ comTarefa: diasComTarefa }}
            modifiersClassNames={{ comTarefa: "font-bold text-primary underline underline-offset-4" }}
          />
        </CardContent>
      </Card>
      <div className="flex-1">
        <h3 className="mb-2 text-sm font-semibold">
          {selected ? selected.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }) : "Selecione um dia"}
        </h3>
        {tarefasDoDia.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa neste dia.</p>
        ) : (
          <TarefaQuadro tarefas={tarefasDoDia.map((t) => ({ ...t, concluida: t.concluida }))} />
        )}
      </div>
    </div>
  );
}
