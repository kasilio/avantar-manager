"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createTarefa } from "@/app/(dashboard)/tarefas/actions";
import { TarefaDetailDialog } from "./tarefa-detail-dialog";
import type { VirtualTarefa } from "@/lib/tarefas";

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TIPO_DOT: Record<VirtualTarefa["tipo"], string> = {
  manual: "bg-primary",
  followup: "bg-info",
  despesa: "bg-warning",
  aniversario: "bg-success",
};

const TIPO_PILL: Record<VirtualTarefa["tipo"], string> = {
  manual: "bg-primary/10 hover:bg-primary/20",
  followup: "bg-info/10 hover:bg-info/20",
  despesa: "bg-warning/10 hover:bg-warning/20",
  aniversario: "bg-success/10 hover:bg-success/20",
};

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MonthCalendar({ tarefas, compact = false }: { tarefas: VirtualTarefa[]; compact?: boolean }) {
  const [mesRef, setMesRef] = useState(() => new Date());
  const [menu, setMenu] = useState<{ data: string; x: number; y: number } | null>(null);
  const [novaTarefaData, setNovaTarefaData] = useState<string | null>(null);
  const [tarefaSelecionada, setTarefaSelecionada] = useState<VirtualTarefa | null>(null);
  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha o menu de contexto ao clicar fora dele — sem um elemento cobrindo
  // a tela inteira pra detectar isso (esse elemento, mesmo invisível,
  // intercepta o clique e some com o menu, mas o clique nunca chega no que
  // o usuário queria de fato tocar, ex. uma tarefa por baixo).
  useEffect(() => {
    if (!menu) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menu]);

  const hoje = toIso(new Date());
  const tarefasPorDia = useMemo(() => {
    const map = new Map<string, VirtualTarefa[]>();
    for (const t of tarefas) {
      if (t.concluida) continue;
      (map.get(t.data) ?? map.set(t.data, []).get(t.data)!).push(t);
    }
    return map;
  }, [tarefas]);

  const celulas = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const inicioGrade = new Date(ano, mes, 1 - primeiroDia.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const data = new Date(inicioGrade);
      data.setDate(inicioGrade.getDate() + i);
      return { data, iso: toIso(data), foraDoMes: data.getMonth() !== mes };
    });
  }, [mesRef]);

  const maxItens = compact ? 1 : 3;

  function abrirMenu(e: React.MouseEvent, iso: string) {
    e.preventDefault();
    setMenu({ data: iso, x: e.clientX, y: e.clientY });
  }

  async function handleCriarTarefa(formData: FormData) {
    await createTarefa(formData);
    setNovaTarefaData(null);
  }

  const ehMesAtual = mesRef.getFullYear() === new Date().getFullYear() && mesRef.getMonth() === new Date().getMonth();

  return (
    <div className={cn("flex flex-col gap-4", !compact && "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5")}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold capitalize tracking-tight sm:text-xl">
            {mesRef.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </span>
          {!compact && !ehMesAtual && (
            <button
              type="button"
              onClick={() => setMesRef(new Date())}
              className="text-xs font-medium text-primary hover:underline"
            >
              Hoje
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full hover:bg-background hover:shadow-sm"
            onClick={() => setMesRef((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full hover:bg-background hover:shadow-sm"
            onClick={() => setMesRef((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="pb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {compact ? d[0] : d}
          </div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7", compact ? "gap-1" : "gap-1.5 sm:gap-2")}>
        {celulas.map(({ data, iso, foraDoMes }, idx) => {
          const itens = tarefasPorDia.get(iso) ?? [];
          const ehHoje = iso === hoje;
          const fimDeSemana = idx % 7 === 0 || idx % 7 === 6;
          return (
            <div
              key={iso}
              onContextMenu={(e) => abrirMenu(e, iso)}
              className={cn(
                "flex flex-col gap-1 rounded-xl border border-transparent p-1 text-left align-top transition-all",
                compact ? "min-h-11" : "min-h-24 p-1.5 sm:min-h-28 sm:p-2",
                !foraDoMes && fimDeSemana && "bg-muted/20",
                !foraDoMes && "hover:border-border hover:bg-muted/40 hover:shadow-sm",
                foraDoMes && "opacity-35",
                ehHoje && "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20 hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[11px] transition-colors",
                  ehHoje ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "font-medium text-muted-foreground",
                )}
              >
                {data.getDate()}
              </span>
              <div className="flex flex-col gap-1">
                {itens.slice(0, maxItens).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTarefaSelecionada(t)}
                    className={cn(
                      "flex items-center gap-1.5 truncate rounded-full px-1.5 py-0.5 text-left text-[10px] leading-tight transition-colors",
                      TIPO_PILL[t.tipo],
                    )}
                    title={t.titulo}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", TIPO_DOT[t.tipo])} />
                    <span className="truncate">{t.titulo}</span>
                  </button>
                ))}
                {itens.length > maxItens && (
                  <button
                    type="button"
                    onClick={() => setDiaDetalhe(iso)}
                    className="w-fit rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                  >
                    +{itens.length - maxItens} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-50 rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            type="button"
            className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            onClick={() => {
              setNovaTarefaData(menu.data);
              setMenu(null);
            }}
          >
            <Plus className="size-3.5" /> Criar tarefa
          </button>
        </div>
      )}

      <Dialog open={novaTarefaData !== null} onOpenChange={(open) => !open && setNovaTarefaData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa — {novaTarefaData ? novaTarefaData.split("-").reverse().join("/") : ""}</DialogTitle>
          </DialogHeader>
          <form action={handleCriarTarefa} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input id="titulo" name="titulo" required />
            </div>
            <input type="hidden" name="data" value={novaTarefaData ?? ""} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" rows={2} />
            </div>
            <DialogFooter>
              <Button type="submit">Criar tarefa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={diaDetalhe !== null} onOpenChange={(open) => !open && setDiaDetalhe(null)}>
        {diaDetalhe && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="capitalize">
                {new Date(`${diaDetalhe}T00:00:00`).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              {(tarefasPorDia.get(diaDetalhe) ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTarefaSelecionada(t)}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className={cn("size-2 shrink-0 rounded-full", TIPO_DOT[t.tipo])} />
                  <span className="flex-1 truncate">{t.titulo}</span>
                  {t.subtitulo && <span className="shrink-0 text-xs text-muted-foreground">{t.subtitulo}</span>}
                </button>
              ))}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <TarefaDetailDialog tarefa={tarefaSelecionada} onOpenChange={(open) => !open && setTarefaSelecionada(null)} />
    </div>
  );
}
