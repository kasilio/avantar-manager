import Link from "next/link";
import { LinkButton } from "@/components/shared/link-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtDateCurta, fmtMoney, periodoAtual } from "@/lib/format";
import type { RepasseLote } from "@/types/database";

export default async function RepassesPage({
  searchParams,
}: {
  searchParams: Promise<{ inicio?: string; fim?: string; cliente_id?: string; tudo?: string }>;
}) {
  const raw = await searchParams;
  const { inicio, fim, tudo } = raw;
  const cliente_id = raw.cliente_id === "__todos__" ? undefined : raw.cliente_id;
  const modoTudo = tudo === "1";
  const temFiltroData = Boolean(inicio && fim);

  const atual = periodoAtual();
  const inicioEfetivo = temFiltroData ? inicio! : modoTudo ? null : `${atual}-01`;
  const fimEfetivo = temFiltroData ? fim! : modoTudo ? null : `${atual}-31`;

  const usuario = await requireCurrentUsuario();
  const isAdmin = usuario.papel === "admin";
  const supabase = await createClient();
  const [{ data: lotesRaw }, { data: clientesRaw }, { data: repassesRaw }] = await Promise.all([
    supabase.from("repasses_lotes").select("*").order("periodo_inicio", { ascending: false }),
    supabase.from("clientes").select("id, nome").order("nome"),
    // RLS já limita o vendedor às próprias produções — usamos essas linhas
    // (em vez de repasses_lotes.comissao_bruta_total, que é da empresa
    // inteira) pra saber o que é dele em cada lote.
    supabase.from("repasses").select("lote_id, comissao_bruta, producoes(comissao_pct)"),
  ]);
  let lotes = (lotesRaw ?? []) as RepasseLote[];
  const clientes = (clientesRaw ?? []) as { id: string; nome: string }[];
  const repasses = (repassesRaw ?? []) as unknown as Array<{
    lote_id: string;
    comissao_bruta: number | null;
    producoes: { comissao_pct: number | null } | null;
  }>;
  const faturadoPorLote = new Map<string, number>();
  const comissaoPorLote = new Map<string, number>();
  for (const r of repasses) {
    const bruto = Number(r.comissao_bruta ?? 0);
    faturadoPorLote.set(r.lote_id, (faturadoPorLote.get(r.lote_id) ?? 0) + bruto);
    const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
    comissaoPorLote.set(r.lote_id, (comissaoPorLote.get(r.lote_id) ?? 0) + bruto * pct);
  }

  if (inicioEfetivo && fimEfetivo) {
    lotes = lotes.filter((l) => l.periodo_inicio <= fimEfetivo && l.periodo_fim >= inicioEfetivo);
  }

  if (cliente_id) {
    const { data: producoesDoCliente } = await supabase.from("producoes").select("id").eq("cliente_id", cliente_id);
    const producaoIds = (producoesDoCliente ?? []).map((p) => p.id);
    const { data: repassesDoCliente } = producaoIds.length > 0
      ? await supabase.from("repasses").select("lote_id").in("producao_id", producaoIds)
      : { data: [] as { lote_id: string }[] };
    const loteIds = new Set((repassesDoCliente ?? []).map((r) => r.lote_id));
    lotes = lotes.filter((l) => loteIds.has(l.id));
  }

  const temFiltroAtivo = temFiltroData || modoTudo || Boolean(cliente_id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Repasses</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <LinkButton href="/repasses/importar">Importar repasses</LinkButton>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inicio" className="text-xs">De</Label>
            <Input id="inicio" name="inicio" type="date" defaultValue={inicio} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fim" className="text-xs">Até</Label>
            <Input id="fim" name="fim" type="date" defaultValue={fim} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cliente_id" className="text-xs">Cliente</Label>
            <Select
              name="cliente_id"
              defaultValue={cliente_id ?? "__todos__"}
              items={{ __todos__: "Todos os clientes", ...Object.fromEntries(clientes.map((c) => [c.id, c.nome])) }}
            >
              <SelectTrigger id="cliente_id" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__todos__">Todos os clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm">Filtrar</Button>
        </form>
        <LinkButton href="/repasses?tudo=1" variant="outline" size="sm">Ver tudo</LinkButton>
        {temFiltroAtivo && <LinkButton href="/repasses" variant="ghost" size="sm">Limpar filtros</LinkButton>}
      </div>

      {!temFiltroAtivo && (
        <p className="text-xs text-muted-foreground">Mostrando o mês vigente — use os filtros acima pra ver outro período.</p>
      )}

      {lotes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum repasse encontrado pra esse filtro.</p>
      )}

      <div className="flex flex-col gap-2">
        {lotes.map((lote) => (
          <Link
            key={lote.id}
            href={`/repasses/${lote.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:border-primary"
          >
            <div>
              <div className="font-medium">
                Repasse {fmtDateCurta(lote.periodo_inicio)} à {fmtDateCurta(lote.periodo_fim)}
              </div>
              {!isAdmin && (
                <div className="text-xs text-success">
                  Sua comissão: {fmtMoney(comissaoPorLote.get(lote.id) ?? 0)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">
                {fmtMoney(isAdmin ? lote.comissao_bruta_total : faturadoPorLote.get(lote.id) ?? 0)}
              </span>
              <StatusBadge status={lote.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
