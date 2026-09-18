import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeguradoraForm } from "@/components/seguradoras/seguradora-form";
import { createClient } from "@/lib/supabase/server";
import { deleteSeguradora, updateSeguradora } from "../actions";

export default async function SeguradoraDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: seguradora }, { data: contatos }] = await Promise.all([
    supabase.from("seguradoras").select("*").eq("id", id).single(),
    supabase.from("seguradoras_contatos").select("*").eq("seguradora_id", id),
  ]);

  if (!seguradora) notFound();

  const updateWithId = updateSeguradora.bind(null, id);
  const deleteWithId = deleteSeguradora.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{seguradora.nome}</h1>
        {!seguradora.bloqueada && (
          <form action={deleteWithId}>
            <Button type="submit" variant="destructive">
              Excluir
            </Button>
          </form>
        )}
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dados da seguradora</CardTitle>
        </CardHeader>
        <CardContent>
          <SeguradoraForm seguradora={seguradora} contatosIniciais={contatos ?? []} action={updateWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
