"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Seguradora } from "@/types/database";

export function SeguradoraForm({
  seguradora,
  action,
}: {
  seguradora?: Seguradora;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={seguradora?.nome ?? ""} required disabled={seguradora?.bloqueada} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="susep">SUSEP</Label>
          <Input id="susep" name="susep" defaultValue={seguradora?.susep ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" name="cnpj" defaultValue={seguradora?.cnpj ?? ""} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" defaultValue={seguradora?.telefone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="site">Site</Label>
          <Input id="site" name="site" defaultValue={seguradora?.site ?? ""} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" name="obs" defaultValue={seguradora?.obs ?? ""} rows={3} />
      </div>
      <Button type="submit" className="self-start">
        {seguradora ? "Salvar alterações" : "Cadastrar seguradora"}
      </Button>
    </form>
  );
}
