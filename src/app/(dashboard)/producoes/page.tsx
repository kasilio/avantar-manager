import { LinkButton } from "@/components/shared/link-button";
import { SearchSelect } from "@/components/shared/search-select";
import { ProducaoTable, type ProducaoRow } from "@/components/producoes/producao-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";

export default async function ProducoesPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; cliente_id?: string; tipo_produto_id?: string }>;
}) {
  const raw = await searchParams;
  const { inicio, fim } = raw;
  const cliente_id = raw.cliente_id === "__todos__" ? undefined : raw.cliente_id;
  const tipo_produto_id = raw.tipo_produto_id === "__todos__" ? undefined : raw.tipo_produto_id;

  const supabase = await createClient();
  const [{ data: producoes }, { data: repassesRaw }, { data: clientesRaw }, { data: tiposProdutoRaw }] = await Promise.all([
    supabase
      .from("producoes")
      .select("*, clientes(nome), tipos_produto(nome), seguradoras(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("repasses").select("producao_id, comissao_bruta, repasses_lotes(status)"),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase.from("tipos_produto").select("id, nome").order("nome"),
  ]);

  const repasses = (repassesRaw ?? []) as unknown as Array<{
    producao_id: string;
    comissao_bruta: number | null;
    repasses_lotes: { status: string } | null;
  }>;
  const faturamentoPorProducao = new Map<string, number>();
  for (const r of repasses) {
    if (r.repasses_lotes?.status !== "pago") continue;
    faturamentoPorProducao.set(r.producao_id, (faturamentoPorProducao.get(r.producao_id) ?? 0) + Number(r.comissao_bruta ?? 0));
  }

  let rows: ProducaoRow[] = ((producoes ?? []) as unknown as ProducaoRow[]).map((p) => ({
    ...p,
    faturamentoGerado: faturamentoPorProducao.get(p.id) ?? 0,
  }));

  if (cliente_id) rows = rows.filter((p) => p.cliente_id === cliente_id);
  if (tipo_produto_id) rows = rows.filter((p) => p.tipo_produto_id === tipo_produto_id);
  if (inicio && fim) {
    rows = rows.filter((p) => p.vigencia_inicio && p.vigencia_fim && p.vigencia_inicio <= fim && p.vigencia_fim >= inicio);
  }

  const clientes = (clientesRaw ?? []) as { id: string; nome: string }[];
  const tiposProduto = (tiposProdutoRaw ?? []) as { id: string; nome: string }[];
  const temFiltroAtivo = Boolean(inicio || fim || cliente_id || tipo_produto_id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produções</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inicio" className="text-xs">Vigência de</Label>
            <Input id="inicio" name="inicio" type="date" defaultValue={inicio} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fim" className="text-xs">até</Label>
            <Input id="fim" name="fim" type="date" defaultValue={fim} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cliente_id" className="text-xs">Cliente</Label>
            <SearchSelect
              id="cliente_id"
              name="cliente_id"
              defaultValue={cliente_id ?? "__todos__"}
              placeholder="Buscar cliente..."
              className="w-56"
              items={[
                { value: "__todos__", label: "Todos os clientes" },
                ...clientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo_produto_id" className="text-xs">Tipo de produto</Label>
            <Select
              name="tipo_produto_id"
              defaultValue={tipo_produto_id ?? "__todos__"}
              items={{ __todos__: "Todos os produtos", ...Object.fromEntries(tiposProduto.map((t) => [t.id, t.nome])) }}
            >
              <SelectTrigger id="tipo_produto_id" className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os produtos</SelectItem>
                {tiposProduto.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm">Filtrar</Button>
        </form>
        {temFiltroAtivo && <LinkButton href="/producoes" variant="ghost" size="sm">Limpar filtros</LinkButton>}
      </div>

      <ProducaoTable producoes={rows} />
    </div>
  );
}
