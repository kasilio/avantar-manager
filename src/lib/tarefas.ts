import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { daysUntilBirthday, today } from "@/lib/format";

export type VirtualTarefa = {
  id: string;
  titulo: string;
  subtitulo?: string;
  data: string;
  tipo: "manual" | "followup" | "despesa" | "aniversario";
  concluida: boolean;
  href?: string;
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
  const hoje = today();
  const limite = new Date();
  limite.setDate(limite.getDate() + horizonteDias);
  const limiteStr = limite.toISOString().slice(0, 10);

  const [{ data: manuais }, { data: followups }, { data: despesas }, { data: contatos }] = await Promise.all([
    supabase.from("tarefas").select("*").order("data"),
    supabase
      .from("followups")
      .select("*, producoes(id, clientes(nome))")
      .is("concluido_em", null)
      .order("due_date"),
    supabase.from("despesas").select("*").eq("ativa", true),
    supabase.from("clientes_contatos").select("*, clientes(nome)").not("aniversario", "is", null),
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
    producoes: { id: string; clientes: { nome: string } | null } | null;
  }>) {
    result.push({
      id: `followup_${f.id}`,
      titulo: f.motivo,
      subtitulo: f.producoes?.clientes?.nome,
      data: f.due_date,
      tipo: "followup",
      concluida: false,
      href: f.producoes ? `/producoes/${f.producoes.id}` : undefined,
    });
  }

  for (const d of despesas ?? []) {
    if (d.tipo === "fixa" && d.dia_vencimento) {
      // Próxima ocorrência do dia de vencimento (mês atual ou o seguinte, se já passou).
      const base = new Date();
      let venc = new Date(base.getFullYear(), base.getMonth(), d.dia_vencimento);
      if (venc < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
        venc = new Date(base.getFullYear(), base.getMonth() + 1, d.dia_vencimento);
      }
      result.push({
        id: `desp_${d.id}`,
        titulo: `Vencimento: ${d.descricao}`,
        data: venc.toISOString().slice(0, 10),
        tipo: "despesa",
        concluida: false,
        href: "/financeiro",
      });
    } else if (d.tipo === "variavel" && d.data && d.data >= hoje && d.data <= limiteStr) {
      result.push({
        id: `desp_${d.id}`,
        titulo: `Vencimento: ${d.descricao}`,
        data: d.data,
        tipo: "despesa",
        concluida: false,
        href: "/financeiro",
      });
    }
  }

  for (const c of (contatos ?? []) as unknown as Array<{
    id: string;
    nome: string;
    aniversario: string;
    cliente_id: string;
    clientes: { nome: string } | null;
  }>) {
    const dias = daysUntilBirthday(c.aniversario);
    if (dias == null || dias > horizonteDias) continue;
    const d = new Date();
    d.setDate(d.getDate() + dias);
    result.push({
      id: `aniv_${c.id}`,
      titulo: `Aniversário: ${c.nome}`,
      subtitulo: c.clientes?.nome,
      data: d.toISOString().slice(0, 10),
      tipo: "aniversario",
      concluida: false,
      href: `/clientes/${c.cliente_id}`,
    });
  }

  return result.sort((a, b) => a.data.localeCompare(b.data));
}
