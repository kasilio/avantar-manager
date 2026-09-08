import { LinkButton } from "@/components/shared/link-button";
import { ClienteTable } from "@/components/clientes/cliente-table";
import { createClient } from "@/lib/supabase/server";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase.from("clientes").select("*").order("nome", { ascending: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <LinkButton href="/clientes/novo">Novo cliente</LinkButton>
      </div>
      <ClienteTable clientes={clientes ?? []} />
    </div>
  );
}
