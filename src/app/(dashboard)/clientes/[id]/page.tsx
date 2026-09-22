import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney, fmtPct } from "@/lib/format";
import type { Producao, Seguradora, TipoProduto } from "@/types/database";
import { deleteCliente, updateCliente } from "../actions";

type ProducaoComRelacoes = Producao & {
  tipos_produto: Pick<TipoProduto, "nome"> | null;
  seguradoras: Pick<Seguradora, "nome"> | null;
};

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireCurrentUsuario();
  const isAdmin = usuario.papel === "admin";
  const supabase = await createClient();

  const [{ data: cliente }, { data: contatos }, { data: producoesRaw }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase.from("clientes_contatos").select("*").eq("cliente_id", id),
    supabase
      .from("producoes")
      .select("*, tipos_produto(nome), seguradoras(nome)")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const producoes = (producoesRaw ?? []) as unknown as ProducaoComRelacoes[];

  if (!cliente) notFound();

  const producaoPorId = new Map(producoes.map((p) => [p.id, p]));
  const { data: repassesRaw } = producoes.length > 0
    ? await supabase
        .from("repasses")
        .select("*, repasses_lotes(status, data_pagamento)")
        .in("producao_id", producoes.map((p) => p.id))
        .order("periodo", { ascending: false })
    : { data: [] as never[] };
  const repasses = (repassesRaw ?? []) as unknown as Array<{
    id: string;
    producao_id: string;
    parcela: string | null;
    periodo: string;
    comissao_bruta: number | null;
    repasses_lotes: { status: string; data_pagamento: string | null } | null;
  }>;
  const totalRecebido = repasses.reduce(
    (sum, r) => sum + (r.repasses_lotes?.status === "pago" ? Number(r.comissao_bruta ?? 0) : 0),
    0,
  );
  const totalComissao = repasses.reduce((sum, r) => {
    if (r.repasses_lotes?.status !== "pago") return sum;
    const pct = Number(producaoPorId.get(r.producao_id)?.comissao_pct ?? 0) / 100;
    return sum + Number(r.comissao_bruta ?? 0) * pct;
  }, 0);

  const updateClienteWithId = updateCliente.bind(null, id);
  const deleteClienteWithId = deleteCliente.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{cliente.nome}</h1>
          <div className="mt-1"><StatusBadge status={cliente.status} /></div>
        </div>
        <form action={deleteClienteWithId}>
          <Button type="submit" variant="destructive">
            Excluir cliente
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Produções ({producoes?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {producoes.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma produção vinculada ainda.</p>
          )}
          {producoes.map((p) => (
              <Link
                key={p.id}
                href={`/producoes/${p.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
              >
                <div>
                  <div className="font-medium">{p.tipos_produto?.nome ?? "Produto"} · {p.seguradoras?.nome ?? "Seguradora"}</div>
                  <div className="text-xs text-muted-foreground">Apólice {p.num_apolice || "—"}</div>
                  {p.comissao_pct != null && (
                    <div className="text-xs text-success">
                      {isAdmin ? "Comissão do vendedor" : "Sua comissão"}: {fmtPct(p.comissao_pct)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {p.premio_mensal != null ? `${fmtMoney(p.premio_mensal)}/mês` : "Prêmio não informado"}
                  </span>
                  <StatusBadge status={p.status_manual} />
                </div>
              </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Histórico de repasses</CardTitle>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <span className="text-muted-foreground">Faturado: {fmtMoney(totalRecebido)}</span>
            <span className="text-success">
              {isAdmin ? "Comissão vendedores" : "Sua comissão"}: {fmtMoney(totalComissao)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {repasses.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum repasse registrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Produção</TableHead>
                    <TableHead className="hidden md:table-cell">Parcela</TableHead>
                    <TableHead>Faturado</TableHead>
                    <TableHead className="hidden md:table-cell">%</TableHead>
                    <TableHead>{isAdmin ? "Comissão vendedor" : "Sua comissão"}</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repasses.map((r) => {
                    const producao = producaoPorId.get(r.producao_id);
                    const pct = producao?.comissao_pct ?? null;
                    const valorComissao = Number(r.comissao_bruta ?? 0) * (Number(pct ?? 0) / 100);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{r.periodo}</TableCell>
                        <TableCell>
                          <Link href={`/producoes/${r.producao_id}`} className="font-medium hover:text-primary">
                            {producao?.tipos_produto?.nome ?? "Produção"}
                          </Link>
                          <div className="text-xs text-muted-foreground">Apólice {producao?.num_apolice || "—"}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{r.parcela || "—"}</TableCell>
                        <TableCell>{fmtMoney(r.comissao_bruta)}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{fmtPct(pct)}</TableCell>
                        <TableCell className="font-medium text-success">{fmtMoney(valorComissao)}</TableCell>
                        <TableCell>
                          {r.repasses_lotes?.status === "pago" ? (
                            <StatusBadge status="pago" />
                          ) : (
                            <StatusBadge status={r.repasses_lotes?.status ?? "aguardando_nf"} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClienteForm cliente={cliente} contatosIniciais={contatos ?? []} action={updateClienteWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
