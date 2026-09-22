import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProducaoForm } from "@/components/producoes/producao-form";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney, fmtPct } from "@/lib/format";
import { deleteProducao, updateProducao } from "../actions";

export default async function ProducaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();

  const [{ data: producao }, { data: clientes }, { data: tiposProduto }, { data: seguradoras }, { data: vendedores }, { data: repassesRaw }] =
    await Promise.all([
      supabase.from("producoes").select("*").eq("id", id).single(),
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("tipos_produto").select("*").order("nome"),
      supabase.from("seguradoras").select("*").order("nome"),
      supabase.from("usuarios").select("*").eq("papel", "vendedor").eq("ativo", true).order("nome"),
      supabase.from("repasses").select("comissao_bruta, repasses_lotes(status)").eq("producao_id", id),
    ]);

  if (!producao) notFound();

  const updateProducaoWithId = updateProducao.bind(null, id);
  const deleteProducaoWithId = deleteProducao.bind(null, id);
  const isAdmin = usuario.papel === "admin";
  const vigenciaIncompleta = !producao.vigencia_inicio || !producao.vigencia_fim;

  const repasses = (repassesRaw ?? []) as unknown as Array<{
    comissao_bruta: number | null;
    repasses_lotes: { status: string } | null;
  }>;
  const faturado = repasses.reduce(
    (sum, r) => sum + (r.repasses_lotes?.status === "pago" ? Number(r.comissao_bruta ?? 0) : 0),
    0,
  );
  const suaComissao = faturado * (Number(producao.comissao_pct ?? 0) / 100);

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

      {vigenciaIncompleta && (
        <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          Vigência não preenchida — complete o início e o fim da vigência abaixo pra manter o cadastro certo e a
          negociação de renovação bem programada.
        </div>
      )}

      {!isAdmin && (
        <Card className="max-w-3xl border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
            <span>Faturado (recebido): <span className="font-medium">{fmtMoney(faturado)}</span></span>
            <span>Sua comissão: <span className="font-semibold text-success">{fmtPct(producao.comissao_pct)}</span></span>
            <span>Valor recebido por você: <span className="font-semibold text-success">{fmtMoney(suaComissao)}</span></span>
          </CardContent>
        </Card>
      )}

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
            readOnly={!isAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
}
