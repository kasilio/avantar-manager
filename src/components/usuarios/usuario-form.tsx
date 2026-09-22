"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { maskCNPJ, maskCPF, maskPhone } from "@/lib/masks";
import type { Usuario } from "@/types/database";

export function UsuarioForm({
  usuario,
  action,
}: {
  usuario?: Usuario;
  action: (formData: FormData) => void;
}) {
  const isEdit = Boolean(usuario);
  const [tipoDoc, setTipoDoc] = useState<"cnpj" | "cpf">(usuario?.tipo_doc ?? "cpf");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={usuario?.nome ?? ""} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={usuario?.email ?? ""} required disabled={isEdit} />
        </div>
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="senha_inicial">Senha inicial</Label>
          <Input id="senha_inicial" name="senha_inicial" type="text" minLength={6} required />
          <p className="text-xs text-muted-foreground">
            Repasse essa senha pro vendedor — ele poderá trocá-la depois de entrar.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="papel">Papel</Label>
          <Select
            name="papel"
            defaultValue={usuario?.papel ?? "vendedor"}
            items={{ vendedor: "Vendedor", admin: "Administrador" }}
          >
            <SelectTrigger id="papel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="susep">SUSEP</Label>
          <Input id="susep" name="susep" defaultValue={usuario?.susep ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tipo de documento</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_doc"
              value="cpf"
              checked={tipoDoc === "cpf"}
              onChange={() => setTipoDoc("cpf")}
            />
            Pessoa física (CPF)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="tipo_doc"
              value="cnpj"
              checked={tipoDoc === "cnpj"}
              onChange={() => setTipoDoc("cnpj")}
            />
            Pessoa jurídica (CNPJ)
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tipoDoc === "cpf" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              defaultValue={usuario?.cpf ?? ""}
              onChange={(e) => (e.target.value = maskCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              defaultValue={usuario?.cnpj ?? ""}
              onChange={(e) => (e.target.value = maskCNPJ(e.target.value))}
              placeholder="00.000.000/0001-00"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={usuario?.whatsapp ?? ""}
            onChange={(e) => (e.target.value = maskPhone(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pix">Chave PIX</Label>
        <Input id="pix" name="pix" defaultValue={usuario?.pix ?? ""} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" name="obs" defaultValue={usuario?.obs ?? ""} rows={3} />
      </div>

      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="ativo" defaultChecked={usuario?.ativo ?? true} />
          Usuário ativo
        </label>
      )}

      <Button type="submit" className="self-start">
        {isEdit ? "Salvar alterações" : "Criar login"}
      </Button>
    </form>
  );
}
