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

export function RepasseForm({
  repasse,
  producoes,
  producaoFixa,
  action,
}: {
  repasse?: Repasse;
  producoes: (Producao & { clientes: Pick<Cliente, "nome"> | null })[];
  producaoFixa?: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      {producaoFixa ? (
        <input type="hidden" name="producao_id" value={producaoFixa} />
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="producao_id">Produção</Label>
          <Select name="producao_id" defaultValue={repasse?.producao_id}>
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
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="parcela">Parcela</Label>
          <Input id="parcela" name="parcela" defaultValue={repasse?.parcela ?? ""} placeholder="1/12" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="periodo">Período (AAAA-MM)</Label>
          <Input id="periodo" name="periodo" defaultValue={repasse?.periodo ?? ""} placeholder="2026-01" required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="comissao_bruta">Comissão bruta</Label>
          <MoneyInput id="comissao_bruta" name="comissao_bruta" defaultValue={repasse?.comissao_bruta} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="apolice_pct">% Apólice</Label>
          <Input id="apolice_pct" name="apolice_pct" type="number" step="0.001" defaultValue={repasse?.apolice_pct ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="repasse_pct">% Repasse</Label>
          <Input id="repasse_pct" name="repasse_pct" type="number" step="0.001" defaultValue={repasse?.repasse_pct ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={repasse?.status ?? "aguardando_nf"}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aguardando_nf">Aguardando NF</SelectItem>
              <SelectItem value="aguardando_pagamento">Aguardando pagamento</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="nf_info">NF</Label>
          <Input id="nf_info" name="nf_info" defaultValue={repasse?.nf_info ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="data_pagamento">Data pagamento</Label>
          <Input id="data_pagamento" name="data_pagamento" type="date" defaultValue={repasse?.data_pagamento ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="valor_pago">Valor pago</Label>
          <MoneyInput id="valor_pago" name="valor_pago" defaultValue={repasse?.valor_pago} />
        </div>
      </div>

      <Button type="submit" className="self-start">
        {repasse ? "Salvar alterações" : "Cadastrar repasse"}
      </Button>
    </form>
  );
}
