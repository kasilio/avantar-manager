import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { daysUntilBirthday } from "@/lib/format";
import { mensagemAniversario, mensagemFollowup } from "@/lib/mensagens";

export type VirtualTarefa = {
  id: string;
  titulo: string;
  subtitulo?: string;
  data: string;
  tipo: "manual" | "followup" | "despesa" | "aniversario";
  concluida: boolean;
  href?: string;
  mensagem?: string;
  produto?: string;
  producaoId?: string;
};

/**
 * Equivalente a todasTarefas() do legacy/avantar-manager.html: unifica
 * tarefas manuais (linhas reais) com follow-ups pendentes, vencimentos de
 * despesa e aniversários de contato — calculados em query, sem duplicar em
 * `tarefas` (mesma decisão do schema, ver supabase/migrations/0001_core.sql).
 * `despesas` só retorna algo pra admin (RLS restringe pra vendedor), o que é
 * o comportamento esperado — vendedor não tem tarefa de vencimento de despesa.
 */
export async function todasTarefas(
  supabase: SupabaseClient<Database>,
  { horizonteDias = 400 }: { horizonteDias?: number } = {},
): Promise<VirtualTarefa[]> {
  const [{ data: manuais }, { data: followups }, { data: contatos }, { data: clientesPf }] = await Promise.all([
    supabase.from("tarefas").select("*").order("data"),
    supabase
      .from("followups")
      .select("*, producoes(id, num_apolice, clientes(nome), tipos_produto(nome))")
      .is("concluido_em", null)
      .order("due_date"),
    supabase.from("clientes_contatos").select("*, clientes(nome)").not("aniversario", "is", null),
    // Cliente pessoa física: o aniversário é do próprio cliente, não de um
    // contato — cliente PJ usa `clientes_contatos.aniversario` (responsável).
    supabase.from("clientes").select("id, nome, nascimento").eq("tipo_doc", "cpf").not("nascimento", "is", null),
  ]);

  const result: VirtualTarefa[] = [];

  for (const t of manuais ?? []) {
    result.push({
      id: `manual_${t.id}`,
      titulo: t.titulo,
      data: t.data,
      tipo: "manual",
      concluida: t.concluida,
    });
  }

  for (const f of (followups ?? []) as unknown as Array<{
    id: string;
    motivo: string;
    due_date: string;
    producoes: {
      id: string;
      num_apolice: string | null;
      clientes: { nome: string } | null;
      tipos_produto: { nome: string } | null;
    } | null;
  }>) {
    const clienteNome = f.producoes?.clientes?.nome ?? "";
    const produtoNome = f.producoes?.tipos_produto?.nome;
    const apolice = f.producoes?.num_apolice;
    result.push({
      id: `followup_${f.id}`,
      titulo: f.motivo,
      subtitulo: clienteNome || undefined,
      data: f.due_date,
      tipo: "followup",
      concluida: false,
      href: f.producoes ? `/producoes/${f.producoes.id}` : undefined,
      mensagem: mensagemFollowup(f.motivo, clienteNome) ?? undefined,
      produto: produtoNome ? `${produtoNome}${apolice ? ` · Apólice ${apolice}` : ""}` : undefined,
      producaoId: f.producoes?.id,
    });
  }

  function pushAniversario(idBase: string, nome: string, aniversario: string, href: string, subtitulo?: string) {
    const dias = daysUntilBirthday(aniversario);
    if (dias == null || dias > horizonteDias) return;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    result.push({
      id: `aniv_${idBase}`,
      titulo: `Aniversário: ${nome}`,
      subtitulo,
      data: d.toISOString().slice(0, 10),
      tipo: "aniversario",
      concluida: false,
      href,
      mensagem: mensagemAniversario(nome),
    });
  }

  for (const c of (contatos ?? []) as unknown as Array<{
    id: string;
    nome: string;
    aniversario: string;
    cliente_id: string;
    clientes: { nome: string } | null;
  }>) {
    pushAniversario(c.id, c.nome, c.aniversario, `/clientes/${c.cliente_id}`, c.clientes?.nome);
  }

  for (const c of (clientesPf ?? []) as Array<{ id: string; nome: string; nascimento: string }>) {
    pushAniversario(`cliente_${c.id}`, c.nome, c.nascimento, `/clientes/${c.id}`);
  }

  return result.sort((a, b) => a.data.localeCompare(b.data));
}
