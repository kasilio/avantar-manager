import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RepasseForm } from "@/components/repasses/repasse-form";
import { createClient } from "@/lib/supabase/server";
import type { Cliente, Producao } from "@/types/database";
import { createRepasse } from "../actions";

export default async function NovoRepassePage({
  searchParams,
}: {
  searchParams: Promise<{ producao_id?: string }>;
}) {
  const { producao_id } = await searchParams;
  const supabase = await createClient();
  const { data: producoesRaw } = await supabase
    .from("producoes")
    .select("*, clientes(nome)")
    .order("created_at", { ascending: false });
  const producoes = (producoesRaw ?? []) as unknown as (Producao & { clientes: Pick<Cliente, "nome"> | null })[];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Novo repasse</CardTitle>
      </CardHeader>
      <CardContent>
        <RepasseForm action={createRepasse} producoes={producoes} producaoFixa={producao_id} />
      </CardContent>
    </Card>
  );
}
