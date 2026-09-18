import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepasseForm } from "@/components/repasses/repasse-form";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Producao, Repasse } from "@/types/database";
import { deleteRepasse, updateRepasse } from "../../../actions";

export default async function RepasseLinhaDetalhePage({
  params,
}: {
  params: Promise<{ id: string; linhaId: string }>;
}) {
  const { linhaId } = await params;
  const supabase = await createClient();

  const [{ data: repasse }, { data: producoesRaw }] = await Promise.all([
    supabase.from("repasses").select("*").eq("id", linhaId).single(),
    supabase.from("producoes").select("*, clientes(nome)").order("created_at", { ascending: false }),
  ]);
  if (!repasse) notFound();

  const producoes = (producoesRaw ?? []) as unknown as (Producao & { clientes: Pick<Cliente, "nome"> | null })[];

  const updateWithId = updateRepasse.bind(null, linhaId);
  const deleteWithId = deleteRepasse.bind(null, linhaId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Editar linha do repasse</h1>
        <form action={deleteWithId}>
          <Button type="submit" variant="destructive">
            Excluir linha
          </Button>
        </form>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados da linha</CardTitle>
        </CardHeader>
        <CardContent>
          <RepasseForm repasse={repasse as Repasse} producoes={producoes} action={updateWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
