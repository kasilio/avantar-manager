import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { FollowupList } from "@/components/crm/followup-list";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import type { Cliente, CrmColuna, Followup, Prospeccao, Producao, TipoProduto, Usuario } from "@/types/database";
import { avancarPerdidosVencidos } from "./actions";

export default async function CrmPage() {
  const usuario = await requireCurrentUsuario();
  await avancarPerdidosVencidos();

  const supabase = await createClient();
  const [
    { data: colunas },
    { data: prospeccoesRaw },
    { data: clientes },
    { data: tiposProduto },
    { data: vendedores },
    { data: followupsRaw },
  ] = await Promise.all([
    supabase.from("crm_colunas").select("*").order("ordem"),
    supabase.from("prospeccoes").select("*, clientes(nome)"),
    supabase.from("clientes").select("*").order("nome"),
    supabase.from("tipos_produto").select("*").order("nome"),
    supabase.from("usuarios").select("*").eq("papel", "vendedor").eq("ativo", true).order("nome"),
    supabase
      .from("followups")
      .select("*, producoes(id, num_apolice, clientes(nome))")
      .is("concluido_em", null)
      .order("due_date"),
  ]);

  const prospeccoes = (prospeccoesRaw ?? []) as unknown as (Prospeccao & { clientes: Pick<Cliente, "nome"> | null })[];
  const followups = (followupsRaw ?? []) as unknown as (Followup & {
    producoes: (Pick<Producao, "id" | "num_apolice"> & { clientes: Pick<Cliente, "nome"> | null }) | null;
  })[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">CRM</h1>
      <Tabs defaultValue="prospeccoes">
        <TabsList>
          <TabsTrigger value="prospeccoes">Prospecções</TabsTrigger>
          <TabsTrigger value="followup">Follow-up automático</TabsTrigger>
        </TabsList>
        <TabsContent value="prospeccoes" className="pt-4">
          <KanbanBoard
            colunas={(colunas ?? []) as CrmColuna[]}
            prospeccoes={prospeccoes}
            clientes={clientes ?? []}
            tiposProduto={(tiposProduto ?? []) as TipoProduto[]}
            vendedores={(vendedores ?? []) as Usuario[]}
            isAdmin={usuario.papel === "admin"}
          />
        </TabsContent>
        <TabsContent value="followup" className="pt-4">
          <FollowupList followups={followups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
