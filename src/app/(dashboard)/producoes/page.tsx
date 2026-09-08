import { LinkButton } from "@/components/shared/link-button";
import { ProducaoTable, type ProducaoRow } from "@/components/producoes/producao-table";
import { createClient } from "@/lib/supabase/server";

export default async function ProducoesPage() {
  const supabase = await createClient();
  const { data: producoes } = await supabase
    .from("producoes")
    .select("*, clientes(nome), tipos_produto(nome), seguradoras(nome)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Produções</h1>
        <LinkButton href="/producoes/novo">Nova produção</LinkButton>
      </div>
      <ProducaoTable producoes={(producoes ?? []) as unknown as ProducaoRow[]} />
    </div>
  );
}
