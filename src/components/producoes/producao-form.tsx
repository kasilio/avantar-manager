"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cliente, Producao, Seguradora, TipoProduto, Usuario } from "@/types/database";

export function ProducaoForm({
  producao,
  clientes,
  tiposProduto,
  seguradoras,
  vendedores,
  clienteFixo,
  action,
  readOnly,
}: {
  producao?: Producao;
  clientes: Cliente[];
  tiposProduto: TipoProduto[];
  seguradoras: Seguradora[];
  vendedores: Usuario[];
  clienteFixo?: string;
  action: (formData: FormData) => void;
  /** Vendedor só enxerga (RLS bloqueia escrita em produções) — trava o form pra não parecer editável. */
  readOnly?: boolean;
}) {
  return (
    <form action={action} className="flex flex-col gap-6">
    <fieldset disabled={readOnly} className="contents">
      {clienteFixo ? (
        <input type="hidden" name="cliente_id" value={clienteFixo} />
      ) : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select
            name="cliente_id"
            defaultValue={producao?.cliente_id}
            items={Object.fromEntries(clientes.map((c) => [c.id, c.nome]))}
          >
            <SelectTrigger id="cliente_id">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tipo_produto_id">Tipo de produto</Label>
          <Select
            name="tipo_produto_id"
            defaultValue={producao?.tipo_produto_id ?? undefined}
            items={Object.fromEntries(tiposProduto.map((t) => [t.id, t.nome]))}
          >
            <SelectTrigger id="tipo_produto_id">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {tiposProduto.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="seguradora_id">Seguradora</Label>
          <Select
            name="seguradora_id"
            defaultValue={producao?.seguradora_id ?? undefined}
            items={Object.fromEntries(seguradoras.map((s) => [s.id, s.nome]))}
          >
            <SelectTrigger id="seguradora_id">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {seguradoras.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="num_apolice">Nº apólice</Label>
          <Input id="num_apolice" name="num_apolice" defaultValue={producao?.num_apolice ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="num_proposta">Nº proposta</Label>
          <Input id="num_proposta" name="num_proposta" defaultValue={producao?.num_proposta ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigencia_inicio">Vigência início</Label>
          <Input id="vigencia_inicio" name="vigencia_inicio" type="date" defaultValue={producao?.vigencia_inicio ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vigencia_fim">Vigência fim</Label>
          <Input id="vigencia_fim" name="vigencia_fim" type="date" defaultValue={producao?.vigencia_fim ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="vendedor_id">Vendedor</Label>
          <Select
            name="vendedor_id"
            defaultValue={producao?.vendedor_id ?? "__none__"}
            items={{ __none__: "🏢 Unidade (sem vendedor)", ...Object.fromEntries(vendedores.map((v) => [v.id, v.nome])) }}
          >
            <SelectTrigger id="vendedor_id">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">🏢 Unidade (sem vendedor)</SelectItem>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="comissao_pct">Comissão do vendedor (%)</Label>
          <Input id="comissao_pct" name="comissao_pct" type="number" step="0.001" min="0" max="100" defaultValue={producao?.comissao_pct ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="status_manual">Status</Label>
          <Select
            name="status_manual"
            defaultValue={producao?.status_manual ?? "ativa"}
            items={{ ativa: "Ativa", vencida: "Vencida", cancelada: "Cancelada" }}
          >
            <SelectTrigger id="status_manual">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ativa">Ativa</SelectItem>
              <SelectItem value="vencida">Vencida</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" name="obs" defaultValue={producao?.obs ?? ""} rows={3} />
      </div>
    </fieldset>

      {!readOnly && (
        <Button type="submit" className="self-start">
          {producao ? "Salvar alterações" : "Cadastrar produção"}
        </Button>
      )}
    </form>
  );
}
