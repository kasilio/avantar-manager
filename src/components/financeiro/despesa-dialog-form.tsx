"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { maskDiaVencimento } from "@/lib/masks";
import { CATEGORIAS_DESPESA_PADRAO } from "@/lib/despesas-categorias";
import { periodoAtual } from "@/lib/format";
import type { Despesa, TipoDespesa } from "@/types/database";

const NOVA_CATEGORIA = "__nova__";

const TIPO_ITEMS: Record<TipoDespesa, string> = {
  fixa: "Fixa (todo mês)",
  variavel: "Variável (data específica)",
  parcelada: "Parcelada (N vezes)",
};

export function DespesaDialogForm({
  despesa,
  categoriasExistentes = [],
  action,
}: {
  despesa?: Despesa;
  categoriasExistentes?: string[];
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<TipoDespesa>(despesa?.tipo ?? "fixa");

  const listaCategorias = Array.from(new Set([...CATEGORIAS_DESPESA_PADRAO, ...categoriasExistentes].filter(Boolean)));
  const [categoriaCustom, setCategoriaCustom] = useState(
    Boolean(despesa?.categoria) && !listaCategorias.includes(despesa!.categoria!),
  );
  const categoriaItems: Record<string, string> = {
    ...Object.fromEntries(listaCategorias.map((c) => [c, c])),
    [NOVA_CATEGORIA]: "+ Nova categoria...",
  };

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant={despesa ? "outline" : "default"}>
            {despesa ? "Editar" : (<><Plus className="size-4" /> Nova despesa</>)}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select name="tipo" value={tipo} onValueChange={(v) => setTipo(v as TipoDespesa)} items={TIPO_ITEMS}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixa">{TIPO_ITEMS.fixa}</SelectItem>
                <SelectItem value="variavel">{TIPO_ITEMS.variavel}</SelectItem>
                <SelectItem value="parcelada">{TIPO_ITEMS.parcelada}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" name="descricao" defaultValue={despesa?.descricao ?? ""} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor</Label>
              <MoneyInput id="valor" name="valor" defaultValue={despesa?.valor} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              {categoriaCustom ? (
                <Input
                  name="categoria"
                  defaultValue={despesa?.categoria ?? ""}
                  placeholder="Digite a categoria"
                  autoFocus
                />
              ) : (
                <Select
                  name="categoria"
                  defaultValue={despesa?.categoria ?? undefined}
                  onValueChange={(v) => {
                    if (v === NOVA_CATEGORIA) setCategoriaCustom(true);
                  }}
                  items={categoriaItems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {listaCategorias.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                    <SelectItem value={NOVA_CATEGORIA}>+ Nova categoria...</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {tipo === "fixa" && (
            <div className="flex flex-col gap-2 sm:w-48">
              <Label htmlFor="dia_vencimento">Dia do vencimento</Label>
              <Input
                id="dia_vencimento"
                name="dia_vencimento"
                inputMode="numeric"
                placeholder="Ex: 10"
                defaultValue={despesa?.dia_vencimento ?? ""}
                onChange={(e) => (e.target.value = maskDiaVencimento(e.target.value))}
              />
            </div>
          )}
          {tipo === "variavel" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={despesa?.data ?? ""} />
            </div>
          )}
          {tipo === "parcelada" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="dia_vencimento">Dia do vencimento</Label>
                <Input
                  id="dia_vencimento"
                  name="dia_vencimento"
                  inputMode="numeric"
                  placeholder="Ex: 10"
                  defaultValue={despesa?.dia_vencimento ?? ""}
                  onChange={(e) => (e.target.value = maskDiaVencimento(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="parcelas_total">Quantidade de parcelas</Label>
                <Input
                  id="parcelas_total"
                  name="parcelas_total"
                  type="number"
                  min={2}
                  max={60}
                  defaultValue={despesa?.parcelas_total ?? ""}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="parcela_inicio">1ª parcela em</Label>
                <Input
                  id="parcela_inicio"
                  name="parcela_inicio"
                  type="month"
                  defaultValue={despesa?.parcela_inicio ?? periodoAtual()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit">{despesa ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
