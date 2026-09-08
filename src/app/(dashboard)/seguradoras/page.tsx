import { LinkButton } from "@/components/shared/link-button";
import { SeguradoraTable } from "@/components/seguradoras/seguradora-table";
import { createClient } from "@/lib/supabase/server";

export default async function SeguradorasPage() {
  const supabase = await createClient();
  const { data: seguradoras } = await supabase.from("seguradoras").select("*").order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Seguradoras</h1>
        <LinkButton href="/seguradoras/novo">Nova seguradora</LinkButton>
      </div>
      <SeguradoraTable seguradoras={seguradoras ?? []} />
    </div>
  );
}
