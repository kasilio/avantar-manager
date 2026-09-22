"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import type { Cliente, Producao, Repasse } from "@/types/database";

/** Edição de uma linha já importada — o lote (de qual PDF ela veio) é fixo,
 * repasses só nascem via importação (ver /repasses/importar). */
export function RepasseForm({
  repasse,
  producoes,
  action,
  readOnly,
}: {
  repasse: Repasse;
  producoes: (Producao & { clientes: Pick<Cliente, "nome"> | null })[];
  action: (formData: FormData) => void;
  /** Vendedor só enxerga (RLS bloqueia escrita em repasses) — trava o form pra não parecer editável. */
  readOnly?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
    <fieldset disabled={readOnly} className="contents">
      <input type="hidden" name="lote_id" value={repasse.lote_id} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="producao_id">Produção</Label>
        <Select
          name="producao_id"
          defaultValue={repasse.producao_id}
          items={Object.fromEntries(producoes.map((p) => [p.id, `${p.clientes?.nome ?? "Cliente"} · ${p.num_apolice || "sem apólice"}`]))}
        >
          <SelectTrigger id="producao_id">
            <SelectValue placeholder="Selecione a produção" />
          </SelectTrigger>
          <SelectContent>
            {producoes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.clientes?.nome ?? "Cliente"} · {p.num_apolice || "sem apólice"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="parcela">Parcela</Label>
          <Input id="parcela" name="parcela" defaultValue={repasse.parcela ?? ""} placeholder="1/12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="periodo">Período (AAAA-MM)</Label>
          <Input id="periodo" name="periodo" defaultValue={repasse.periodo} placeholder="2026-01" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="comissao_bruta">Comissão bruta</Label>
          <MoneyInput id="comissao_bruta" name="comissao_bruta" defaultValue={repasse.comissao_bruta} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="apolice_pct">% Apólice</Label>
          <Input id="apolice_pct" name="apolice_pct" type="number" step="0.001" defaultValue={repasse.apolice_pct ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repasse_pct">% Repasse</Label>
          <Input id="repasse_pct" name="repasse_pct" type="number" step="0.001" defaultValue={repasse.repasse_pct ?? ""} />
        </div>
      </div>
    </fieldset>

      {!readOnly && (
        <Button type="submit" className="self-start">
          Salvar alterações
        </Button>
      )}
    </form>
  );
}
