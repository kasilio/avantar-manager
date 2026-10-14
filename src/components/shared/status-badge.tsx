import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  ativo: { label: "🟢 Ativo", className: "bg-success/15 text-success border-success/30" },
  ativa: { label: "🟢 Ativa", className: "bg-success/15 text-success border-success/30" },
  prospect: { label: "🔵 Prospect", className: "bg-info/15 text-info border-info/30" },
  inativo: { label: "⚫ Inativo", className: "bg-muted text-muted-foreground border-border" },
  vencendo: { label: "🟡 Vencendo", className: "bg-warning/15 text-warning border-warning/30" },
  vencida: { label: "🔴 Vencida", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelada: { label: "⚫ Cancelada", className: "bg-muted text-muted-foreground border-border" },
  aguardando_nf: { label: "Aguardando NF", className: "bg-warning/15 text-warning border-warning/30" },
  aguardando_pagamento: { label: "Aguardando pagamento", className: "bg-info/15 text-info border-info/30" },
  pago: { label: "🟢 Pago", className: "bg-success/15 text-success border-success/30" },
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground border-border" },
  enviado: { label: "Aguardando confirmação", className: "bg-warning/15 text-warning border-warning/30" },
  confirmado: { label: "🟢 Confirmado", className: "bg-success/15 text-success border-success/30" },
  assinado: { label: "Assinado", className: "bg-info/15 text-info border-info/30" },
  enviando: { label: "Enviando", className: "bg-info/15 text-info border-info/30" },
  autorizado: { label: "🟢 Autorizado", className: "bg-success/15 text-success border-success/30" },
  rejeitado: { label: "🔴 Rejeitado", className: "bg-destructive/15 text-destructive border-destructive/30" },
  erro: { label: "🔴 Erro", className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelado: { label: "⚫ Cancelado", className: "bg-muted text-muted-foreground border-border" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("font-medium", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}
