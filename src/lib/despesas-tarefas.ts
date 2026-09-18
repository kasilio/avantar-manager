import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Despesa } from "@/types/database";
import { fmtMoney, today } from "@/lib/format";

/** Fixa: gera lembretes pra esse tanto de meses à frente, contando o mês
 * vigente — não tem cron nessa aplicação, então "todo mês" na prática é "um
 * horizonte generoso, mantido pela regeneração a cada edição da despesa". */
const HORIZONTE_MESES_FIXA = 24;

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

function paraIso(ano: number, mes: number, dia: number): string {
  const d = new Date(ano, mes, dia);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monta a lista de datas (uma por ocorrência) de lembrete de pagamento pra
 * essa despesa, a partir de hoje (ocorrências já passadas não entram — são
 * histórico, não mexemos nelas). */
function calcularOcorrencias(despesa: Pick<Despesa, "tipo" | "dia_vencimento" | "data" | "parcelas_total" | "parcela_inicio">): Array<{ data: string; parcela?: [number, number] }> {
  const hoje = today();
  const ocorrencias: Array<{ data: string; parcela?: [number, number] }> = [];

  if (despesa.tipo === "variavel") {
    if (despesa.data && despesa.data >= hoje) ocorrencias.push({ data: despesa.data });
    return ocorrencias;
  }

  if (despesa.tipo === "fixa") {
    if (!despesa.dia_vencimento) return ocorrencias;
    const ref = new Date();
    for (let i = 0; i < HORIZONTE_MESES_FIXA; i++) {
      const ano = ref.getFullYear();
      const mes = ref.getMonth() + i;
      const anoAjustado = ano + Math.floor(mes / 12);
      const mesAjustado = ((mes % 12) + 12) % 12;
      const dia = Math.min(despesa.dia_vencimento, ultimoDiaDoMes(anoAjustado, mesAjustado));
      const iso = paraIso(anoAjustado, mesAjustado, dia);
      if (iso >= hoje) ocorrencias.push({ data: iso });
    }
    return ocorrencias;
  }

  if (despesa.tipo === "parcelada") {
    if (!despesa.dia_vencimento || !despesa.parcelas_total || !despesa.parcela_inicio) return ocorrencias;
    const [anoIni, mesIni] = despesa.parcela_inicio.split("-").map(Number);
    for (let i = 0; i < despesa.parcelas_total; i++) {
      const mesAbs = mesIni - 1 + i;
      const ano = anoIni + Math.floor(mesAbs / 12);
      const mes = ((mesAbs % 12) + 12) % 12;
      const dia = Math.min(despesa.dia_vencimento, ultimoDiaDoMes(ano, mes));
      const iso = paraIso(ano, mes, dia);
      if (iso >= hoje) ocorrencias.push({ data: iso, parcela: [i + 1, despesa.parcelas_total] });
    }
    return ocorrencias;
  }

  return ocorrencias;
}

/** Períodos ("YYYY-MM") cobertos por uma despesa parcelada, do primeiro ao
 * último — usado pelo DRE pra saber se ela está "ativa" num mês, passado ou
 * futuro (diferente de calcularOcorrencias, que só olha lembretes futuros). */
export function periodosParcelada(parcelaInicio: string, parcelasTotal: number): string[] {
  const [anoIni, mesIni] = parcelaInicio.split("-").map(Number);
  return Array.from({ length: parcelasTotal }, (_, i) => {
    const mesAbs = mesIni - 1 + i;
    const ano = anoIni + Math.floor(mesAbs / 12);
    const mes = ((mesAbs % 12) + 12) % 12;
    return `${ano}-${String(mes + 1).padStart(2, "0")}`;
  });
}

/** (Re)gera as tarefas de lembrete de pagamento de uma despesa: apaga as que
 * ainda não venceram/foram concluídas e ainda não aconteceram (preserva
 * histórico — passado e já concluídas nunca são mexidos) e recria a partir
 * da configuração atual (tipo, dia de vencimento, valor, parcelas). Chamado
 * ao criar e ao editar a despesa. */
export async function regenerarTarefasDespesa(
  supabase: SupabaseClient<Database>,
  despesa: Pick<Despesa, "id" | "tipo" | "descricao" | "valor" | "dia_vencimento" | "data" | "parcelas_total" | "parcela_inicio" | "ativa">,
) {
  await supabase
    .from("tarefas")
    .delete()
    .eq("origem_despesa_id", despesa.id)
    .eq("concluida", false)
    .gte("data", today());

  if (!despesa.ativa) return;

  const ocorrencias = calcularOcorrencias(despesa);
  if (ocorrencias.length === 0) return;

  const linhas = ocorrencias.map(({ data, parcela }) => ({
    titulo: `Pagar: ${despesa.descricao}${parcela ? ` (parcela ${parcela[0]}/${parcela[1]})` : ""} — ${fmtMoney(despesa.valor)}`,
    data,
    descricao: null,
    vendedor_id: null,
    origem_despesa_id: despesa.id,
  }));
  await supabase.from("tarefas").insert(linhas);
}
