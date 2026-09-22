import { LinkButton } from "@/components/shared/link-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClienteTable, type ClienteResumo } from "@/components/clientes/cliente-table";
import { createClient } from "@/lib/supabase/server";
import type { StatusCliente } from "@/types/database";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; status?: string }>;
}) {
  const { sort, dir, status } = await searchParams;
  const statusFiltro = status === "ativo" || status === "inativo" || status === "prospect" ? (status as StatusCliente) : undefined;
  const supabase = await createClient();
  const [{ data: clientes }, { data: producoesRaw }, { data: repassesRaw }] = await Promise.all([
    supabase.from("clientes").select("*"),
    supabase.from("producoes").select("id, cliente_id, status_manual, vigencia_inicio, vigencia_fim"),
    supabase.from("repasses").select("producao_id, comissao_bruta, repasses_lotes(status)"),
  ]);

  const producoes = (producoesRaw ?? []) as Array<{
    id: string;
    cliente_id: string;
    status_manual: string;
    vigencia_inicio: string | null;
    vigencia_fim: string | null;
  }>;
  const repasses = (repassesRaw ?? []) as unknown as Array<{
    producao_id: string;
    comissao_bruta: number | null;
    repasses_lotes: { status: string } | null;
  }>;

  const clienteIdPorProducao = new Map(producoes.map((p) => [p.id, p.cliente_id]));
  const faturamentoPorCliente = new Map<string, number>();
  for (const r of repasses) {
    if (r.repasses_lotes?.status !== "pago") continue;
    const clienteId = clienteIdPorProducao.get(r.producao_id);
    if (!clienteId) continue;
    faturamentoPorCliente.set(clienteId, (faturamentoPorCliente.get(clienteId) ?? 0) + Number(r.comissao_bruta ?? 0));
  }

  const vigenciaPorCliente = new Map<string, { inicio: string | null; fim: string | null }>();
  for (const p of producoes) {
    if (p.status_manual !== "ativa") continue;
    const atual = vigenciaPorCliente.get(p.cliente_id) ?? { inicio: null, fim: null };
    if (p.vigencia_inicio && (!atual.inicio || p.vigencia_inicio < atual.inicio)) atual.inicio = p.vigencia_inicio;
    if (p.vigencia_fim && (!atual.fim || p.vigencia_fim > atual.fim)) atual.fim = p.vigencia_fim;
    vigenciaPorCliente.set(p.cliente_id, atual);
  }

  let resumos: ClienteResumo[] = (clientes ?? []).map((c) => ({
    ...c,
    faturamento: faturamentoPorCliente.get(c.id) ?? 0,
    vigenciaInicio: vigenciaPorCliente.get(c.id)?.inicio ?? null,
    vigenciaFim: vigenciaPorCliente.get(c.id)?.fim ?? null,
  }));

  if (statusFiltro) resumos = resumos.filter((c) => c.status === statusFiltro);

  const sortCol = sort === "faturamento" ? "faturamento" : "nome";
  const sortDir = dir === "desc" ? "desc" : "asc";
  resumos.sort((a, b) => {
    const cmp = sortCol === "faturamento" ? a.faturamento - b.faturamento : a.nome.localeCompare(b.nome, "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <LinkButton href="/clientes/novo">Novo cliente</LinkButton>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <input type="hidden" name="sort" value={sortCol} />
          <input type="hidden" name="dir" value={sortDir} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status" className="text-xs">Status</Label>
            <Select
              name="status"
              defaultValue={statusFiltro ?? "__todos__"}
              items={{ __todos__: "Todos", prospect: "🔵 Prospect", ativo: "🟢 Ativo", inativo: "⚫ Inativo" }}
            >
              <SelectTrigger id="status" className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos</SelectItem>
                <SelectItem value="prospect">🔵 Prospect</SelectItem>
                <SelectItem value="ativo">🟢 Ativo</SelectItem>
                <SelectItem value="inativo">⚫ Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm">Filtrar</Button>
        </form>
        {statusFiltro && (
          <LinkButton href={`/clientes?sort=${sortCol}&dir=${sortDir}`} variant="ghost" size="sm">
            Limpar filtro
          </LinkButton>
        )}
      </div>

      <ClienteTable clientes={resumos} sort={sortCol} dir={sortDir} status={status} />
    </div>
  );
}
