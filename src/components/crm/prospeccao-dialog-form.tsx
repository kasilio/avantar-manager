"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cliente, Prospeccao, TipoProduto, Usuario } from "@/types/database";

export function ProspeccaoDialogForm({
  prospeccao,
  colunaId,
  clientes,
  tiposProduto,
  vendedores,
  isAdmin,
  action,
  trigger,
}: {
  prospeccao?: Prospeccao;
  colunaId: string;
  clientes: Cliente[];
  tiposProduto: TipoProduto[];
  vendedores: Usuario[];
  isAdmin: boolean;
  action: (formData: FormData) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prospeccao ? "Editar prospecção" : "Nova prospecção"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="coluna_id" value={prospeccao?.coluna_id ?? colunaId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`empresa-${colunaId}`}>Empresa</Label>
            <Input id={`empresa-${colunaId}`} name="empresa" defaultValue={prospeccao?.empresa ?? ""} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Cliente vinculado (opcional)</Label>
            <Select name="cliente_id" defaultValue={prospeccao?.cliente_id ?? "__none__"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Produto de interesse</Label>
            <Select name="tipo_produto_id" defaultValue={prospeccao?.tipo_produto_id ?? "__none__"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {tiposProduto.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-2">
              <Label>Vendedor responsável</Label>
              <Select name="vendedor_id" defaultValue={prospeccao?.vendedor_id ?? "__none__"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">🏢 Unidade</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`next-${colunaId}`}>Próximo contato</Label>
            <Input id={`next-${colunaId}`} name="next_contact" type="date" defaultValue={prospeccao?.next_contact ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`obs-${colunaId}`}>Observações</Label>
            <Textarea id={`obs-${colunaId}`} name="obs" defaultValue={prospeccao?.obs ?? ""} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit">{prospeccao ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
