import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyInput } from "@/components/shared/money-input";
import { RepasseForm } from "@/components/repasses/repasse-form";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/format";
import type { Cliente, Producao } from "@/types/database";
import { deleteRepasse, informarNf, registrarPagamento, updateRepasse } from "../actions";

export default async function RepasseDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: repasse }, { data: producoesRaw }] = await Promise.all([
    supabase.from("repasses").select("*").eq("id", id).single(),
    supabase.from("producoes").select("*, clientes(nome)").order("created_at", { ascending: false }),
  ]);
  const producoes = (producoesRaw ?? []) as unknown as (Producao & { clientes: Pick<Cliente, "nome"> | null })[];

  if (!repasse) notFound();

  const updateWithId = updateRepasse.bind(null, id);
  const deleteWithId = deleteRepasse.bind(null, id);
  const informarNfWithId = informarNf.bind(null, id);
  const registrarPagamentoWithId = registrarPagamento.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Repasse {repasse.periodo}</h1>
          <div className="mt-1"><StatusBadge status={repasse.status} /></div>
        </div>
        <form action={deleteWithId}>
          <Button type="submit" variant="destructive">
            Excluir repasse
          </Button>
        </form>
      </div>

      {repasse.status !== "pago" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {repasse.status === "aguardando_nf" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🧾 Informar NF</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={informarNfWithId} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="nf_info">Número da NF</Label>
                    <Input id="nf_info" name="nf_info" defaultValue={repasse.nf_info ?? ""} required />
                  </div>
                  <Button type="submit" size="sm" className="self-start">
                    Confirmar NF
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">💰 Registrar pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={registrarPagamentoWithId} className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="data_pagamento">Data</Label>
                    <Input id="data_pagamento" name="data_pagamento" type="date" defaultValue={today()} required />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="valor_pago">Valor pago</Label>
                    <MoneyInput id="valor_pago" name="valor_pago" defaultValue={repasse.comissao_bruta} />
                  </div>
                </div>
                <Button type="submit" size="sm" className="self-start">
                  Confirmar pagamento
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do repasse</CardTitle>
        </CardHeader>
        <CardContent>
          <RepasseForm repasse={repasse} producoes={producoes} action={updateWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
