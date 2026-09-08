import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProducaoForm } from "@/components/producoes/producao-form";
import { createClient } from "@/lib/supabase/server";
import { createProducao } from "../actions";

export default async function NovaProducaoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente_id?: string }>;
}) {
  const { cliente_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: clientes }, { data: tiposProduto }, { data: seguradoras }, { data: vendedores }] =
    await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("tipos_produto").select("*").order("nome"),
      supabase.from("seguradoras").select("*").order("nome"),
      supabase.from("usuarios").select("*").eq("papel", "vendedor").eq("ativo", true).order("nome"),
    ]);

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Nova produção</CardTitle>
      </CardHeader>
      <CardContent>
        <ProducaoForm
          action={createProducao}
          clientes={clientes ?? []}
          tiposProduto={tiposProduto ?? []}
          seguradoras={seguradoras ?? []}
          vendedores={vendedores ?? []}
          clienteFixo={cliente_id}
        />
      </CardContent>
    </Card>
  );
}
