"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/money-input";
import { upsertMetaMensal } from "@/app/(dashboard)/actions";

export function MetaDialogForm({ periodo, valorAtual }: { periodo: string; valorAtual: number }) {
  const [open, setOpen] = useState(false);
  const action = upsertMetaMensal.bind(null, periodo);

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Pencil className="size-4" /> Editar meta
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta do mês</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="valor">Meta de comissão recebida (R$)</Label>
            <MoneyInput id="valor" name="valor" defaultValue={valorAtual} required />
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
