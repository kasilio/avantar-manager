"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cancelarNfse } from "@/app/(dashboard)/notas-fiscais/actions";

const MOTIVOS = [
  { value: "1", label: "Erro na emissão" },
  { value: "2", label: "Serviço não prestado" },
  { value: "9", label: "Outros" },
] as const;

export function CancelarNfseForm({ id }: { id: string }) {
  const [aberto, setAberto] = useState(false);
  const [cMotivo, setCMotivo] = useState<string>("1");
  const [xMotivo, setXMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) {
    return (
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setAberto(true)}>
        <Ban className="size-4" /> Cancelar NF
      </Button>
    );
  }

  async function handleCancelar() {
    setErro(null);
    if (xMotivo.trim().length < 15) {
      setErro("Descreva o motivo com pelo menos 15 caracteres.");
      return;
    }
    if (!confirm("Cancelar esta NFS-e junto ao governo? Essa ação não tem volta.")) return;
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.set("cMotivo", cMotivo);
      formData.set("xMotivo", xMotivo.trim());
      await cancelarNfse(id, formData);
      setAberto(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao cancelar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-medium text-destructive">Cancelar NFS-e</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="cMotivo">Motivo</Label>
        <select
          id="cMotivo"
          value={cMotivo}
          onChange={(e) => setCMotivo(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MOTIVOS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="xMotivo">Descrição (15 a 255 caracteres)</Label>
        <textarea
          id="xMotivo"
          value={xMotivo}
          onChange={(e) => setXMotivo(e.target.value)}
          maxLength={255}
          rows={3}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="destructive" disabled={enviando} onClick={handleCancelar}>
          {enviando ? "Cancelando…" : "Confirmar cancelamento"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAberto(false)} disabled={enviando}>
          Voltar
        </Button>
      </div>
    </div>
  );
}
