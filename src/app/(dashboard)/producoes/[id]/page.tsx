import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProducaoForm } from "@/components/producoes/producao-form";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { concluirFollowup, deleteProducao, updateProducao } from "../actions";

export default async function ProducaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();

  const [{ data: producao }, { data: clientes }, { data: tiposProduto }, { data: seguradoras }, { data: vendedores }, { data: followups }] =
    await Promise.all([
      supabase.from("producoes").select("*").eq("id", id).single(),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("tipos_produto").select("*").order("nome"),
      supabase.from("seguradoras").select("*").order("nome"),
      supabase.from("usuarios").select("*").eq("papel", "vendedor").eq("ativo", true).order("nome"),
      supabase.from("followups").select("*").eq("producao_id", id).order("due_date"),
    ]);

  if (!producao) notFound();

  const updateProducaoWithId = updateProducao.bind(null, id);
  const deleteProducaoWithId = deleteProducao.bind(null, id);
  const isAdmin = usuario.papel === "admin";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Produção {producao.num_apolice || ""}</h1>
        {isAdmin && (
          <form action={deleteProducaoWithId}>
            <Button type="submit" variant="destructive">
              Excluir produção
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(followups ?? []).map((f) => {
            const concluirWithId = concluirFollowup.bind(null, f.id, id);
            return (
              <div
                key={f.id}
                className={cn(
                  "flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm",
                  f.concluido_em && "opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  {f.concluido_em ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  <span>{f.motivo}</span>
                  <span className="text-xs text-muted-foreground">({f.dias}d — {fmtDate(f.due_date)})</span>
                </div>
                {!f.concluido_em && (
                  <form action={concluirWithId}>
                    <Button type="submit" size="sm" variant="outline">
                      Concluir
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dados da produção</CardTitle>
        </CardHeader>
        <CardContent>
          <ProducaoForm
            producao={producao}
            action={updateProducaoWithId}
            clientes={clientes ?? []}
            tiposProduto={tiposProduto ?? []}
            seguradoras={seguradoras ?? []}
            vendedores={vendedores ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
