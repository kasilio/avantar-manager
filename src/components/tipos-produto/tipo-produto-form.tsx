"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TipoProduto } from "@/types/database";

export function TipoProdutoForm({
  tipo,
  action,
}: {
  tipo?: TipoProduto;
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={tipo?.nome ?? ""} required disabled={tipo?.bloqueada} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" name="descricao" defaultValue={tipo?.descricao ?? ""} rows={3} />
      </div>
      <Button type="submit" className="self-start">
        {tipo ? "Salvar alterações" : "Cadastrar tipo de produto"}
      </Button>
    </form>
  );
}
