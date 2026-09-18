"use client";

import { MonthCalendar } from "./month-calendar";
import type { VirtualTarefa } from "@/lib/tarefas";

export function TarefaCalendario({ tarefas }: { tarefas: VirtualTarefa[] }) {
  return <MonthCalendar tarefas={tarefas} />;
}
