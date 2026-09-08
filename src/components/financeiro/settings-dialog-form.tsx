"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
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
import { updateSettings } from "@/app/(dashboard)/financeiro/actions";
import type { Settings } from "@/types/database";

export function SettingsDialogForm({ settings }: { settings: Settings }) {
  const [open, setOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    await updateSettings(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button type="button" variant="outline" size="sm">
          <Settings2 className="size-4" /> Configurações
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurações financeiras</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="aliquota_simples">Alíquota Simples Nacional (%)</Label>
            <Input
              id="aliquota_simples"
              name="aliquota_simples"
              type="number"
              step="0.01"
              defaultValue={settings.aliquota_simples}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="meta_mensal">Meta mensal (R$)</Label>
            <Input
              id="meta_mensal"
              name="meta_mensal"
              type="number"
              step="0.01"
              defaultValue={settings.meta_mensal}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
