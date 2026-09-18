import { LinkButton } from "@/components/shared/link-button";
import { ClienteTable, type ClienteResumo } from "@/components/clientes/cliente-table";
import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string }>;
}) {
  const { sort, dir } = await searchParams;
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

  const resumos: ClienteResumo[] = (clientes ?? []).map((c) => ({
    ...c,
    faturamento: faturamentoPorCliente.get(c.id) ?? 0,
    vigenciaInicio: vigenciaPorCliente.get(c.id)?.inicio ?? null,
    vigenciaFim: vigenciaPorCliente.get(c.id)?.fim ?? null,
  }));

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
      <ClienteTable clientes={resumos} sort={sortCol} dir={sortDir} />
    </div>
  );
}
