import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TipoProdutoForm } from "@/components/tipos-produto/tipo-produto-form";
import { createClient } from "@/lib/supabase/server";
import { deleteTipoProduto, updateTipoProduto } from "../actions";

export default async function TipoProdutoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tipo } = await supabase.from("tipos_produto").select("*").eq("id", id).single();

  if (!tipo) notFound();

  const updateWithId = updateTipoProduto.bind(null, id);
  const deleteWithId = deleteTipoProduto.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{tipo.nome}</h1>
        {!tipo.bloqueada && (
          <form action={deleteWithId}>
            <Button type="submit" variant="destructive">
              Excluir
            </Button>
          </form>
        )}
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dados do tipo de produto</CardTitle>
        </CardHeader>
        <CardContent>
          <TipoProdutoForm tipo={tipo} action={updateWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
