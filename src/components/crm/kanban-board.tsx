"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { moverProspeccao, deleteProspeccao, updateProspeccao, createProspeccao } from "@/app/(dashboard)/crm/actions";
import { ProspeccaoDialogForm } from "./prospeccao-dialog-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Cliente, CrmColuna, Prospeccao, ProspeccaoHistorico, TipoProduto, Usuario } from "@/types/database";

type ProspeccaoRow = Prospeccao & { clientes: Pick<Cliente, "nome"> | null };

export function KanbanBoard({
  colunas,
  prospeccoes,
  clientes,
  tiposProduto,
  vendedores,
  historico,
  isAdmin,
}: {
  colunas: CrmColuna[];
  prospeccoes: ProspeccaoRow[];
  clientes: Cliente[];
  tiposProduto: TipoProduto[];
  vendedores: Usuario[];
  historico: ProspeccaoHistorico[];
  isAdmin: boolean;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<string | null>(null);
  const [movimento, setMovimento] = useState<{ prospeccaoId: string; colunaId: string; empresa: string; colunaLabel: string } | null>(null);
  const [nota, setNota] = useState("");
  const [enviando, startTransition] = useTransition();

  function onDrop(colunaId: string) {
    const card = draggingId ? prospeccoes.find((p) => p.id === draggingId) : null;
    const coluna = colunas.find((c) => c.id === colunaId);
    if (card && coluna && card.coluna_id !== colunaId) {
      setNota("");
      setMovimento({ prospeccaoId: card.id, colunaId, empresa: card.empresa, colunaLabel: coluna.label });
    }
    setDraggingId(null);
    setDragOverColuna(null);
  }

  function confirmarMovimento() {
    if (!movimento || !nota.trim()) return;
    startTransition(async () => {
      await moverProspeccao(movimento.prospeccaoId, movimento.colunaId, nota);
      setMovimento(null);
    });
  }

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:[grid-template-columns:repeat(var(--num-colunas),minmax(0,1fr))]"
      style={{ "--num-colunas": colunas.length } as CSSProperties}
    >
      {colunas.map((coluna) => {
        const cards = prospeccoes.filter((p) => p.coluna_id === coluna.id);
        return (
          <div
            key={coluna.id}
            className={cn(
              "flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-2",
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
                colunas={colunas}
                historico={[]}
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
              {cards.map((card) => {
                const vendedorNome = card.vendedor_id ? vendedores.find((v) => v.id === card.vendedor_id)?.nome : null;
                return (
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
                    colunas={colunas}
                    historico={historico.filter((h) => h.prospeccao_id === card.id)}
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
                        {isAdmin && (
                          <div className="mt-1 text-[11px] text-primary">
                            {vendedorNome ? `👤 ${vendedorNome}` : "🏢 Unidade"}
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
                );
              })}
            </div>
          </div>
        );
      })}

      <Dialog open={movimento !== null} onOpenChange={(open) => !open && setMovimento(null)}>
        {movimento && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover &quot;{movimento.empresa}&quot; para {movimento.colunaLabel}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nota-movimento">Observação (obrigatória)</Label>
              <Textarea
                id="nota-movimento"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={3}
                autoFocus
                placeholder="O que aconteceu nessa negociação?"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMovimento(null)}>Cancelar</Button>
              <Button type="button" onClick={confirmarMovimento} disabled={!nota.trim() || enviando}>
                {enviando ? "Movendo..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
