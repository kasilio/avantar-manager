import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/format";
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
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{fmtMoney(p.premio_mensal)}/mês</span>
                  <StatusBadge status={p.status_manual} />
                </div>
              </Link>
          ))}
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
