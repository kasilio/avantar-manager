import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/money-input";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { fmtDateCurta, fmtMoney, today } from "@/lib/format";
import { criarRascunho } from "../actions";

export default async function NovaNfsePage({
  searchParams,
}: {
  searchParams: Promise<{ loteId?: string }>;
}) {
  await requireAdmin();
  const { loteId } = await searchParams;
  const supabase = await createClient();

  if (!loteId) {
    const { data: lotes } = await supabase
      .from("repasses_lotes")
      .select("id, periodo_inicio, periodo_fim, comissao_bruta_total")
      .eq("status", "aguardando_nf")
      .is("nf_arquivo_base64", null)
      .order("periodo_fim", { ascending: false });

    return (
      <div className="flex max-w-md flex-col gap-6">
        <h1 className="text-2xl font-semibold">Nova NF</h1>
        <p className="text-sm text-muted-foreground">
          Toda NF corresponde a um lote de repasse já importado. Escolha qual lote essa nota cobre:
        </p>
        <div className="flex flex-col gap-2">
          {(lotes ?? []).map((l) => (
            <Link key={l.id} href={`/notas-fiscais/nova?loteId=${l.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardContent className="flex items-center justify-between py-3 text-sm">
                  <span>{fmtDateCurta(l.periodo_inicio)} à {fmtDateCurta(l.periodo_fim)}</span>
                  <span className="font-medium">{fmtMoney(l.comissao_bruta_total)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(lotes ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum lote aguardando NF no momento — importe repasses primeiro ou confira em Repasses.
            </p>
          )}
        </div>
      </div>
    );
  }

  const { data: lote } = await supabase
    .from("repasses_lotes")
    .select("id, periodo_inicio, periodo_fim, comissao_bruta_total, status")
    .eq("id", loteId)
    .maybeSingle();
  if (!lote || lote.status !== "aguardando_nf") notFound();

  const hoje = today();

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nova NF</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da nota</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarRascunho} className="flex flex-col gap-4">
            <input type="hidden" name="lote_id" value={lote.id} />
            <p className="text-xs text-muted-foreground">
              Repasse de {fmtDateCurta(lote.periodo_inicio)} à {fmtDateCurta(lote.periodo_fim)} — valor sugerido a
              partir do total do lote, mas editável. Prestador, tomador e serviço já estão fixos no sistema. O
              próximo passo mostra tudo pra revisão antes de assinar e transmitir.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor da nota</Label>
              <MoneyInput id="valor" name="valor" defaultValue={lote.comissao_bruta_total} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="competencia">Competência</Label>
              <Input id="competencia" name="competencia" type="date" defaultValue={hoje} required />
            </div>
            <Button type="submit">Criar rascunho</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
