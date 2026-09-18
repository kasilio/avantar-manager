"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { maskPhone } from "@/lib/masks";
import type { Seguradora, SeguradoraContato, TipoContatoSeguradora } from "@/types/database";

const TIPO_CONTATO_ITEMS: Record<TipoContatoSeguradora, string> = {
  ponto_focal: "Ponto focal",
  financeiro: "Financeiro",
  averbacao: "Averbação",
};

type Contato = {
  tipo: TipoContatoSeguradora;
  nome: string;
  telefone: string;
  email: string;
};

function toContato(c?: SeguradoraContato): Contato {
  return {
    tipo: c?.tipo ?? "ponto_focal",
    nome: c?.nome ?? "",
    telefone: c?.telefone ?? "",
    email: c?.email ?? "",
  };
}

export function SeguradoraForm({
  seguradora,
  contatosIniciais,
  action,
}: {
  seguradora?: Seguradora;
  contatosIniciais?: SeguradoraContato[];
  action: (formData: FormData) => void;
}) {
  const [contatos, setContatos] = useState<Contato[]>(
    () => contatosIniciais?.map(toContato) ?? [toContato()],
  );

  function addContato() {
    setContatos((prev) => [...prev, toContato()]);
  }
  function removeContato(idx: number) {
    setContatos((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateContato(idx: number, patch: Partial<Contato>) {
    setContatos((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="contatos_json" value={JSON.stringify(contatos)} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" defaultValue={seguradora?.nome ?? ""} required disabled={seguradora?.bloqueada} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Contatos</Label>
          <Button type="button" variant="outline" size="sm" onClick={addContato}>
            <Plus className="size-4" /> Adicionar contato
          </Button>
        </div>
        {contatos.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado ainda.</p>
        )}
        {contatos.map((c, idx) => (
          <div key={idx} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={c.tipo}
                onValueChange={(v) => v && updateContato(idx, { tipo: v as TipoContatoSeguradora })}
                items={TIPO_CONTATO_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_CONTATO_ITEMS) as [TipoContatoSeguradora, string][]).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Nome</Label>
              <Input value={c.nome} onChange={(e) => updateContato(idx, { nome: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Telefone</Label>
              <Input value={c.telefone} onChange={(e) => updateContato(idx, { telefone: maskPhone(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={c.email} onChange={(e) => updateContato(idx, { email: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeContato(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit" className="self-start">
        {seguradora ? "Salvar alterações" : "Cadastrar seguradora"}
      </Button>
    </form>
  );
}
