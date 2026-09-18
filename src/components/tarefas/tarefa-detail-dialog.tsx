"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopiarMensagemButton } from "@/components/shared/copiar-mensagem-button";
import { fmtDate } from "@/lib/format";
import { toggleTarefa } from "@/app/(dashboard)/tarefas/actions";
import { concluirFollowup } from "@/app/(dashboard)/producoes/actions";
import type { VirtualTarefa } from "@/lib/tarefas";

export function TarefaDetailDialog({
  tarefa,
  onOpenChange,
}: {
  tarefa: VirtualTarefa | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [concluindo, startTransition] = useTransition();

  const podeConcluir =
    !!tarefa && !tarefa.concluida && (tarefa.tipo === "manual" || (tarefa.tipo === "followup" && !!tarefa.producaoId));

  function handleConcluir() {
    if (!tarefa) return;
    startTransition(async () => {
      if (tarefa.tipo === "manual") {
        await toggleTarefa(tarefa.id.replace("manual_", ""), true);
      } else if (tarefa.tipo === "followup" && tarefa.producaoId) {
        await concluirFollowup(tarefa.id.replace("followup_", ""), tarefa.producaoId);
      }
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={tarefa !== null} onOpenChange={onOpenChange}>
      {tarefa && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tarefa.titulo}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            {tarefa.subtitulo && (
              <div>
                <div className="text-xs text-muted-foreground">Cliente</div>
                <div className="font-medium">{tarefa.subtitulo}</div>
              </div>
            )}
            {tarefa.produto && (
              <div>
                <div className="text-xs text-muted-foreground">Produto / produção</div>
                <div className="font-medium">{tarefa.produto}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Data</div>
              <div className="font-medium">{fmtDate(tarefa.data)}</div>
            </div>
            {tarefa.mensagem && (
              <div className="flex flex-col gap-1.5 rounded-md bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Mensagem pronta</div>
                <p className="text-sm">{tarefa.mensagem}</p>
                <CopiarMensagemButton mensagem={tarefa.mensagem} />
              </div>
            )}
            {tarefa.concluida && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                <Check className="size-3.5" /> Tarefa concluída
              </p>
            )}
          </div>
          {podeConcluir && (
            <DialogFooter>
              <Button type="button" onClick={handleConcluir} disabled={concluindo}>
                <Check className="size-4" /> {concluindo ? "Concluindo..." : "Marcar como concluída"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
