"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { transmitir } from "@/app/(dashboard)/financeiro/nfse/actions";

export function TransmitirNfseForm({ id }: { id: string }) {
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleTransmitir() {
    setErro(null);
    setEnviando(true);
    try {
      await transmitir(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao transmitir.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start gap-2">
        <Checkbox
          id="confirmo-revisao"
          checked={confirmado}
          onCheckedChange={(checked) => setConfirmado(checked === true)}
        />
        <Label htmlFor="confirmo-revisao" className="text-sm font-normal">
          Confirmo que revisei os dados acima (valor, competência, prestador, tomador e serviço) e
          quero transmitir esta nota ao Ambiente Nacional.
        </Label>
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <Button type="button" disabled={!confirmado || enviando} onClick={handleTransmitir} className="sm:w-fit">
        <Send className="size-4" /> {enviando ? "Transmitindo…" : "Confirmar e transmitir"}
      </Button>
    </div>
  );
}
