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
import type { Despesa } from "@/types/database";

export function DespesaDialogForm({
  despesa,
  action,
}: {
  despesa?: Despesa;
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"fixa" | "variavel">(despesa?.tipo ?? "fixa");

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button type="button" size="sm" variant={despesa ? "outline" : "default"}>
          {despesa ? "Editar" : (<><Plus className="size-4" /> Nova despesa</>)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select name="tipo" value={tipo} onValueChange={(v) => setTipo(v as "fixa" | "variavel")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixa">Fixa (todo mês)</SelectItem>
                <SelectItem value="variavel">Variável (data específica)</SelectItem>
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
              <Label htmlFor="categoria">Categoria</Label>
              <Input id="categoria" name="categoria" defaultValue={despesa?.categoria ?? ""} />
            </div>
          </div>
          {tipo === "fixa" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="dia_vencimento">Dia do vencimento</Label>
              <Input
                id="dia_vencimento"
                name="dia_vencimento"
                type="number"
                min={1}
                max={31}
                defaultValue={despesa?.dia_vencimento ?? ""}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" defaultValue={despesa?.data ?? ""} />
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
