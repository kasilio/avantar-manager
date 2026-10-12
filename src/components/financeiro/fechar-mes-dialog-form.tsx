"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
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
import { MoneyInput } from "@/components/shared/money-input";
import { brDateToIso, mesLabel } from "@/lib/format";
import { fecharMes, parseDas } from "@/app/(dashboard)/financeiro/actions";
import type { FechamentoMensal } from "@/types/database";

export function FecharMesDialogForm({
  periodo,
  fechamento,
}: {
  periodo: string;
  fechamento: FechamentoMensal | null;
}) {
  const [open, setOpen] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [numeroDocumento, setNumeroDocumento] = useState(fechamento?.das_numero_documento ?? "");
  const [vencimento, setVencimento] = useState(fechamento?.das_vencimento ?? "");
  const [valor, setValor] = useState(fechamento?.das_valor ?? undefined);

  async function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalisando(true);
    try {
      const fd = new FormData();
      fd.append("das_arquivo", file);
      const parsed = await parseDas(fd);
      if (parsed.numeroDocumento) setNumeroDocumento(parsed.numeroDocumento);
      if (parsed.vencimento) setVencimento(brDateToIso(parsed.vencimento) ?? "");
      if (parsed.valor !== null) setValor(parsed.valor);
    } finally {
      setAnalisando(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setErro(null);
    try {
      const resultado = await fecharMes(periodo, formData);
      if (resultado?.error) {
        setErro(resultado.error);
        return;
      }
      setOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao fechar o mês.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Lock className="size-4" /> Fechar mês
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar {mesLabel(periodo)}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Anexe o PDF do DAS pra preencher os campos automaticamente (ou digite à mão) — o mês só fecha se todos os
            repasses dele já estiverem marcados como pagos.
          </p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="das_arquivo">PDF do DAS (opcional)</Label>
            <Input id="das_arquivo" name="das_arquivo" type="file" accept="application/pdf" onChange={handleArquivoChange} />
            {analisando && <p className="text-xs text-muted-foreground">Lendo o PDF…</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="das_numero_documento">Número do documento</Label>
              <Input
                id="das_numero_documento"
                name="das_numero_documento"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="das_vencimento">Vencimento</Label>
              <Input
                id="das_vencimento"
                name="das_vencimento"
                type="date"
                value={vencimento ?? ""}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:w-48">
            <Label htmlFor="das_valor">Valor do DAS</Label>
            <MoneyInput key={valor ?? "vazio"} id="das_valor" name="das_valor" defaultValue={valor} required />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="submit">Confirmar fechamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
