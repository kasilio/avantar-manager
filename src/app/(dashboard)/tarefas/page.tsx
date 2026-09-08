import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TarefaQuadro } from "@/components/tarefas/tarefa-quadro";
import { NovaTarefaDialog } from "@/components/tarefas/nova-tarefa-dialog";
import { TarefaCalendario } from "@/components/tarefas/tarefa-calendario";
import { createClient } from "@/lib/supabase/server";
import { todasTarefas } from "@/lib/tarefas";

export default async function TarefasPage() {
  const supabase = await createClient();
  const tarefas = await todasTarefas(supabase);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <NovaTarefaDialog />
      </div>
      <Tabs defaultValue="quadro">
        <TabsList>
          <TabsTrigger value="quadro">Quadro</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>
        <TabsContent value="quadro" className="pt-4">
          <TarefaQuadro tarefas={tarefas} />
        </TabsContent>
        <TabsContent value="calendario" className="pt-4">
          <TarefaCalendario tarefas={tarefas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
