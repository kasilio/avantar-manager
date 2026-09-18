"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
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
import { maskCEP, maskCNPJ, maskCPF, maskPhone } from "@/lib/masks";
import type { Cliente, ClienteContato } from "@/types/database";

type Contato = {
  nome: string;
  cargo: string;
  whatsapp: string;
  email: string;
  aniversario: string;
};

function toContato(c?: ClienteContato): Contato {
  return {
    nome: c?.nome ?? "",
    cargo: c?.cargo ?? "",
    whatsapp: c?.whatsapp ?? "",
    email: c?.email ?? "",
    aniversario: c?.aniversario ?? "",
  };
}

export function ClienteForm({
  cliente,
  contatosIniciais,
  action,
}: {
  cliente?: Cliente;
  contatosIniciais?: ClienteContato[];
  action: (formData: FormData) => void;
}) {
  const [tipoDoc, setTipoDoc] = useState<"cnpj" | "cpf">(cliente?.tipo_doc ?? "cnpj");
  const [contatos, setContatos] = useState<Contato[]>(() => {
    if (contatosIniciais && contatosIniciais.length > 0) return contatosIniciais.map(toContato);
    // PJ: já abre um contato em branco pra cadastrar a pessoa física
    // responsável — é de lá que vem o aniversário usado na automação de
    // parabéns por WhatsApp.
    return tipoDoc === "cnpj" ? [toContato()] : [];
  });
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const cnpjRef = useRef<HTMLInputElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const fantasiaRef = useRef<HTMLInputElement>(null);
  const situacaoRef = useRef<HTMLInputElement>(null);
  const cnaeRef = useRef<HTMLInputElement>(null);
  const porteRef = useRef<HTMLInputElement>(null);
  const cepRef = useRef<HTMLInputElement>(null);
  const logradouroRef = useRef<HTMLInputElement>(null);
  const bairroRef = useRef<HTMLInputElement>(null);
  const cidadeRef = useRef<HTMLInputElement>(null);

  async function buscarCnpj() {
    const cnpj = (cnpjRef.current?.value ?? "").replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setBuscandoCnpj(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) throw new Error("CNPJ não encontrado");
      const data = await res.json();
      if (nomeRef.current && !nomeRef.current.value) nomeRef.current.value = data.razao_social ?? "";
      if (fantasiaRef.current) fantasiaRef.current.value = data.nome_fantasia ?? "";
      if (situacaoRef.current) situacaoRef.current.value = data.descricao_situacao_cadastral ?? "";
      if (cnaeRef.current) cnaeRef.current.value = data.cnae_fiscal_descricao ?? "";
      if (porteRef.current) porteRef.current.value = data.descricao_porte ?? "";
      if (cepRef.current) cepRef.current.value = maskCEP(data.cep ?? "");
      if (logradouroRef.current) logradouroRef.current.value = data.logradouro ?? "";
      if (bairroRef.current) bairroRef.current.value = data.bairro ?? "";
      if (cidadeRef.current) cidadeRef.current.value = data.municipio ? `${data.municipio}/${data.uf ?? ""}` : "";
    } catch {
      // silencioso — busca é um atalho, usuário pode preencher manualmente
    } finally {
      setBuscandoCnpj(false);
    }
  }

  async function buscarCep() {
    const cep = (cepRef.current?.value ?? "").replace(/\D/g, "");
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      if (logradouroRef.current) logradouroRef.current.value = data.logradouro ?? "";
      if (bairroRef.current) bairroRef.current.value = data.bairro ?? "";
      if (cidadeRef.current) cidadeRef.current.value = data.localidade ? `${data.localidade}/${data.uf ?? ""}` : "";
    } catch {
      // silencioso
    } finally {
      setBuscandoCep(false);
    }
  }

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
        <Label>Tipo de documento</Label>
        <div className="flex gap-4">
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
        </div>
      </div>

      {tipoDoc === "cnpj" ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              ref={cnpjRef}
              defaultValue={cliente?.cnpj ?? ""}
              onChange={(e) => (e.target.value = maskCNPJ(e.target.value))}
              placeholder="00.000.000/0001-00"
            />
          </div>
          <Button type="button" variant="outline" onClick={buscarCnpj} disabled={buscandoCnpj} className="self-end">
            {buscandoCnpj ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              defaultValue={cliente?.cpf ?? ""}
              onChange={(e) => (e.target.value = maskCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nascimento">Nascimento</Label>
            <Input id="nascimento" name="nascimento" type="date" defaultValue={cliente?.nascimento ?? ""} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome / Razão social</Label>
          <Input id="nome" name="nome" ref={nomeRef} defaultValue={cliente?.nome ?? ""} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="fantasia">Nome fantasia</Label>
          <Input id="fantasia" name="fantasia" ref={fantasiaRef} defaultValue={cliente?.fantasia ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="situacao">Situação cadastral</Label>
          <Input id="situacao" name="situacao" ref={situacaoRef} defaultValue={cliente?.situacao ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnae">CNAE</Label>
          <Input id="cnae" name="cnae" ref={cnaeRef} defaultValue={cliente?.cnae ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="porte">Porte</Label>
          <Input id="porte" name="porte" ref={porteRef} defaultValue={cliente?.porte ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <div className="text-sm font-medium">Endereço</div>
        <div className="grid gap-4 sm:grid-cols-[160px_1fr_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              name="cep"
              ref={cepRef}
              defaultValue={cliente?.cep ?? ""}
              onChange={(e) => (e.target.value = maskCEP(e.target.value))}
              placeholder="00000-000"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" name="logradouro" ref={logradouroRef} defaultValue={cliente?.logradouro ?? ""} />
          </div>
          <Button type="button" variant="outline" onClick={buscarCep} disabled={buscandoCep} className="self-end">
            {buscandoCep ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Buscar
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" name="numero" defaultValue={cliente?.numero ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" name="bairro" ref={bairroRef} defaultValue={cliente?.bairro ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cidade">Cidade/UF</Label>
            <Input id="cidade" name="cidade" ref={cidadeRef} defaultValue={cliente?.cidade ?? ""} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tel">Telefone</Label>
          <Input
            id="tel"
            name="tel"
            defaultValue={cliente?.tel ?? ""}
            onChange={(e) => (e.target.value = maskPhone(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email_com">E-mail comercial</Label>
          <Input id="email_com" name="email_com" type="email" defaultValue={cliente?.email_com ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:w-64">
        <Label htmlFor="status">Status</Label>
        <Select
          name="status"
          defaultValue={cliente?.status ?? "prospect"}
          items={{ prospect: "🔵 Prospect", ativo: "🟢 Ativo", inativo: "⚫ Inativo" }}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prospect">🔵 Prospect</SelectItem>
            <SelectItem value="ativo">🟢 Ativo</SelectItem>
            <SelectItem value="inativo">⚫ Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            Contatos
            {tipoDoc === "cnpj" && (
              <span className="ml-2 font-normal text-xs text-muted-foreground">
                cadastre a pessoa física responsável — o aniversário dela gera o lembrete automático de parabéns
              </span>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addContato}>
            <Plus className="size-4" /> Adicionar contato
          </Button>
        </div>
        {contatos.map((c, idx) => (
          <div key={idx} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-5 sm:items-end">
            <div className="flex flex-col gap-1 sm:col-span-1">
              <Label className="text-xs">Nome</Label>
              <Input value={c.nome} onChange={(e) => updateContato(idx, { nome: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Cargo</Label>
              <Input value={c.cargo} onChange={(e) => updateContato(idx, { cargo: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">WhatsApp</Label>
              <Input
                value={c.whatsapp}
                onChange={(e) => updateContato(idx, { whatsapp: maskPhone(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Aniversário</Label>
              <Input type="date" value={c.aniversario} onChange={(e) => updateContato(idx, { aniversario: e.target.value })} />
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeContato(idx)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="obs">Observações</Label>
        <Textarea id="obs" name="obs" defaultValue={cliente?.obs ?? ""} rows={3} />
      </div>

      <Button type="submit" className="self-start">
        {cliente ? "Salvar alterações" : "Cadastrar cliente"}
      </Button>
    </form>
  );
}
