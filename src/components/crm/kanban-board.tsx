"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { moverProspeccao, deleteProspeccao, updateProspeccao, createProspeccao } from "@/app/(dashboard)/crm/actions";
import { ProspeccaoDialogForm } from "./prospeccao-dialog-form";
import { Button } from "@/components/ui/button";
import type { Cliente, CrmColuna, Prospeccao, TipoProduto, Usuario } from "@/types/database";

type ProspeccaoRow = Prospeccao & { clientes: Pick<Cliente, "nome"> | null };

export function KanbanBoard({
  colunas,
  prospeccoes,
  clientes,
  tiposProduto,
  vendedores,
  isAdmin,
}: {
  colunas: CrmColuna[];
  prospeccoes: ProspeccaoRow[];
  clientes: Cliente[];
  tiposProduto: TipoProduto[];
  vendedores: Usuario[];
  isAdmin: boolean;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onDrop(colunaId: string) {
    if (draggingId) {
      startTransition(() => {
        moverProspeccao(draggingId, colunaId);
      });
    }
    setDraggingId(null);
    setDragOverColuna(null);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {colunas.map((coluna) => {
        const cards = prospeccoes.filter((p) => p.coluna_id === coluna.id);
        return (
          <div
            key={coluna.id}
            className={cn(
              "flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-2",
              dragOverColuna === coluna.id && "ring-2 ring-primary",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColuna(coluna.id);
            }}
            onDragLeave={() => setDragOverColuna((c) => (c === coluna.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              onDrop(coluna.id);
            }}
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                <span>{coluna.icon}</span>
                {coluna.label}
                <span className="text-xs font-normal text-muted-foreground">({cards.length})</span>
              </div>
              <ProspeccaoDialogForm
                colunaId={coluna.id}
                clientes={clientes}
                tiposProduto={tiposProduto}
                vendedores={vendedores}
                isAdmin={isAdmin}
                action={createProspeccao}
                trigger={
                  <Button type="button" variant="ghost" size="icon" className="size-6">
                    <Plus className="size-4" />
                  </Button>
                }
              />
            </div>
            {coluna.nota && <p className="px-1 text-[11px] text-muted-foreground">{coluna.nota}</p>}

            <div className="flex flex-col gap-2">
              {cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDraggingId(card.id)}
                  onDragEnd={() => setDraggingId(null)}
                  className={cn(
                    "cursor-grab rounded-md border border-border bg-background p-2 text-sm shadow-sm active:cursor-grabbing",
                    draggingId === card.id && "opacity-50",
                  )}
                >
                  <ProspeccaoDialogForm
                    prospeccao={card}
                    colunaId={coluna.id}
                    clientes={clientes}
                    tiposProduto={tiposProduto}
                    vendedores={vendedores}
                    isAdmin={isAdmin}
                    action={updateProspeccao.bind(null, card.id)}
                    trigger={
                      <div className="text-left">
                        <div className="font-medium">{card.empresa}</div>
                        {card.clientes?.nome && (
                          <div className="text-xs text-muted-foreground">{card.clientes.nome}</div>
                        )}
                        {card.next_contact && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Próx. contato: {fmtDate(card.next_contact)}
                          </div>
                        )}
                      </div>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => deleteProspeccao(card.id)}
                    className="mt-1 text-[11px] text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
