"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { moverProspeccao } from "@/app/(dashboard)/crm/actions";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import type { Cliente, CrmColuna, Prospeccao, ProspeccaoHistorico, TipoProduto, Usuario } from "@/types/database";

const NOVA_EMPRESA = "__novo__";

/** Campo "Prospect": digita e vai filtrando os cadastros existentes — se
 * nenhum bater, o texto digitado vira um cadastro novo (só com o nome) ao
 * salvar. Não é um <Select>: escolher da lista ou simplesmente digitar um
 * nome que não existe ainda são os dois caminhos válidos. */
function ProspectCombobox({ clientes, buscaInicial, clienteIdInicial }: {
  clientes: Cliente[];
  buscaInicial: string;
  clienteIdInicial: string | null;
}) {
  const [busca, setBusca] = useState(buscaInicial);
  const [clienteId, setClienteId] = useState<string | null>(clienteIdInicial);
  const [aberto, setAberto] = useState(false);

  const termo = busca.trim().toLowerCase();
  const filtrados = (termo ? clientes.filter((c) => c.nome.toLowerCase().includes(termo)) : clientes).slice(0, 8);
  const temMatchExato = clientes.some((c) => c.nome.toLowerCase() === termo);

  function selecionar(c: Cliente) {
    setBusca(c.nome);
    setClienteId(c.id);
    setAberto(false);
  }

  return (
    <div className="relative flex flex-col gap-2">
      <input type="hidden" name="cliente_id" value={clienteId ?? NOVA_EMPRESA} />
      <input type="hidden" name="empresa_novo_nome" value={clienteId ? "" : busca} />
      <Input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setClienteId(null);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder="Nome do cliente ou prospect"
        autoComplete="off"
        required
      />
      {aberto && (filtrados.length > 0 || (termo && !temMatchExato)) && (
        <div className="absolute top-full z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selecionar(c)}
              className={cn(
                "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted",
                clienteId === c.id && "bg-muted",
              )}
            >
              {c.nome}
            </button>
          ))}
          {termo && !temMatchExato && (
            <div className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
              Nenhum cadastro encontrado — &quot;{busca}&quot; será cadastrado como novo ao salvar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProspeccaoDialogForm({
  prospeccao,
  colunaId,
  clientes,
  tiposProduto,
  vendedores,
  colunas,
  historico,
  isAdmin,
  action,
  trigger,
}: {
  prospeccao?: Prospeccao;
  colunaId: string;
  clientes: Cliente[];
  tiposProduto: TipoProduto[];
  vendedores: Usuario[];
  colunas: CrmColuna[];
  historico: ProspeccaoHistorico[];
  isAdmin: boolean;
  action: (formData: FormData) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Prospecção sem cliente_id (dado legado, de antes dessa mudança) cai como
  // texto livre no combobox — o nome digitado já estava salvo, só não tinha
  // vínculo com um cadastro ainda.
  const clienteExiste = !!prospeccao?.cliente_id && clientes.some((c) => c.id === prospeccao.cliente_id);
  const [notaEtapa, setNotaEtapa] = useState("");
  const [enviandoEtapa, startTransitionEtapa] = useTransition();

  // "Próxima etapa" só faz sentido dentro do funil principal (Novo → Em
  // contato → Levantamento → Proposta → Fechado) — Perdido/Follow-up são
  // saídas do funil, não têm "próxima" natural.
  const idxAtual = colunas.findIndex((c) => c.id === (prospeccao?.coluna_id ?? colunaId));
  const proximaColuna = idxAtual >= 0 && idxAtual < 4 ? colunas[idxAtual + 1] : null;

  function nomeAutor(usuarioId: string | null) {
    return vendedores.find((v) => v.id === usuarioId)?.nome ?? "—";
  }
  // "vendedores" também carrega admins (pra resolver nomeAutor do histórico,
  // que pode ter sido movido por qualquer um) — o seletor abaixo só faz
  // sentido com quem de fato é vendedor.
  const opcoesVendedor = vendedores.filter((v) => v.papel === "vendedor");
  function labelColuna(id: string) {
    return colunas.find((c) => c.id === id)?.label ?? id;
  }

  async function handleSubmit(formData: FormData) {
    await action(formData);
    setOpen(false);
  }

  function enviarProximaEtapa() {
    if (!prospeccao || !proximaColuna || !notaEtapa.trim()) return;
    startTransitionEtapa(async () => {
      await moverProspeccao(prospeccao.id, proximaColuna.id, notaEtapa);
      setNotaEtapa("");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prospeccao ? "Editar prospecção" : "Nova prospecção"}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <input type="hidden" name="coluna_id" value={prospeccao?.coluna_id ?? colunaId} />
          <div className="flex flex-col gap-2">
            <Label>Prospect</Label>
            <ProspectCombobox
              clientes={clientes}
              buscaInicial={prospeccao ? (clienteExiste ? clientes.find((c) => c.id === prospeccao.cliente_id)!.nome : prospeccao.empresa) : ""}
              clienteIdInicial={clienteExiste ? prospeccao!.cliente_id : null}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Produto de interesse</Label>
            <Select
              name="tipo_produto_id"
              defaultValue={prospeccao?.tipo_produto_id ?? "__none__"}
              items={{ __none__: "Nenhum", ...Object.fromEntries(tiposProduto.map((t) => [t.id, t.nome])) }}
            >
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
              <Select
                name="vendedor_id"
                defaultValue={prospeccao?.vendedor_id ?? "__none__"}
                items={{ __none__: "🏢 Unidade", ...Object.fromEntries(opcoesVendedor.map((v) => [v.id, v.nome])) }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">🏢 Unidade</SelectItem>
                  {opcoesVendedor.map((v) => (
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

        {prospeccao && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            {proximaColuna && (
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <Label htmlFor={`nota-etapa-${prospeccao.id}`}>
                  Observação pra enviar de {labelColuna(prospeccao.coluna_id)} para {proximaColuna.label}
                </Label>
                <Textarea
                  id={`nota-etapa-${prospeccao.id}`}
                  value={notaEtapa}
                  onChange={(e) => setNotaEtapa(e.target.value)}
                  rows={2}
                  placeholder="O que aconteceu nessa negociação?"
                />
                <Button
                  type="button"
                  size="sm"
                  className="self-start"
                  onClick={enviarProximaEtapa}
                  disabled={!notaEtapa.trim() || enviandoEtapa}
                >
                  <ArrowRight className="size-4" />
                  {enviandoEtapa ? "Enviando..." : `Enviar para ${proximaColuna.label}`}
                </Button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Histórico da negociação</Label>
              {historico.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma movimentação registrada ainda.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {historico.map((h) => (
                    <div key={h.id} className="rounded-md border border-border p-2 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{labelColuna(h.coluna_anterior)} → {labelColuna(h.coluna_nova)}</span>
                        <span>{fmtDate(h.created_at)}</span>
                      </div>
                      <p className="mt-1">{h.nota}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">por {nomeAutor(h.usuario_id)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
