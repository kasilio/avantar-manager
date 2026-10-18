import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, Cake, MessagesSquare, Wallet, ShieldCheck, Building2, Target, CalendarDays, TrendingUp } from "lucide-react";
import { MonthCalendar } from "@/components/tarefas/month-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RankingList } from "@/components/dashboard/ranking-list";
import { MetaDialogForm } from "@/components/dashboard/meta-dialog-form";
import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney, fmtDate, periodoAtual, shiftPeriodo, mesLabel, diasNoMes, diaDoMes } from "@/lib/format";
import { todasTarefas } from "@/lib/tarefas";
import type { ProducaoRow } from "@/components/producoes/producao-table";

type RepasseAgregado = {
  periodo: string;
  comissao_bruta: number | null;
  producoes: {
    comissao_pct: number | null;
    clientes: { nome: string } | null;
    tipos_produto: { nome: string } | null;
    seguradoras: { nome: string } | null;
  } | null;
  repasses_lotes: { status: string; periodo_fim: string | null } | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();

  const atual = periodoAtual();
  const periodo = mes || atual;
  const isFuturo = periodo > atual;
  const isAdmin = usuario.papel === "admin";

  if (isAdmin) {
    const tituloSolicitarDas = `Solicitar DAS para o contador — ${mesLabel(atual)}`;
    const { data: solicitarDasExistente } = await supabase
      .from("tarefas")
      .select("id")
      .eq("titulo", tituloSolicitarDas)
      .maybeSingle();
    if (!solicitarDasExistente) {
      await supabase.from("tarefas").insert({
        titulo: tituloSolicitarDas,
        data: `${atual}-01`,
        descricao: `Pedir ao contador a guia do DAS (Simples Nacional) referente a ${mesLabel(atual)}.`,
        vendedor_id: null,
      });
    }
  }

  const mesesEvolucao = Array.from({ length: 12 }, (_, i) => shiftPeriodo(atual, i - 11));

  // Tudo que não depende de nenhum outro resultado busca de uma vez, em
  // paralelo — antes eram ~7 idas e vindas sequenciais ao Supabase (e
  // 4 delas liam a tabela `repasses` inteira separadamente, de formas
  // diferentes). Agora é uma rodada só; as agregações (previsão de
  // transporte, total do período, evolução mensal, rankings do admin) são
  // todas derivadas em memória do mesmo `repassesRaw`, com os mesmos
  // filtros de antes — mesmo resultado, só que sem repetir a consulta.
  // RLS já restringe o que vem de volta (vendedor só vê a própria
  // carteira — ver supabase/migrations/0001_core.sql), sem precisar
  // filtrar de novo aqui.
  const [
    { data: producoesAtivasRaw },
    { count: clientesAtivos },
    tarefas,
    { data: repassesRaw },
    { data: settingsRow },
    { count: prospeccoesAbertasCount },
    { data: lotesTodosRaw },
    { data: metaRow },
  ] = await Promise.all([
    supabase.from("producoes").select("*, clientes(nome)").eq("status_manual", "ativa"),
    supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "ativo"),
    todasTarefas(supabase, { horizonteDias: 400 }),
    supabase
      .from("repasses")
      .select(
        "periodo, comissao_bruta, producoes(comissao_pct, clientes(nome), tipos_produto(nome), seguradoras(nome)), repasses_lotes(status, periodo_fim)",
      ),
    supabase.from("settings").select("*").eq("id", true).single(),
    supabase.from("prospeccoes").select("*", { count: "exact", head: true }).neq("coluna_id", "fechado").neq("coluna_id", "perdido"),
    isAdmin ? supabase.from("repasses_lotes").select("*") : Promise.resolve({ data: null }),
    isAdmin ? supabase.from("metas_mensais").select("*").eq("periodo", atual).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const producoesAtivas = (producoesAtivasRaw ?? []) as unknown as ProducaoRow[];
  const allRows = (repassesRaw ?? []) as unknown as RepasseAgregado[];
  const prospeccoesAbertas = prospeccoesAbertasCount ?? 0;

  // Previsão de faturamento do ramo Transporte: comissão é recorrente mês a
  // mês por apólice, então a projeção pro próximo mês é a média de TODOS os
  // meses fechados que já tiveram comissão de transporte recebida (não um
  // número fixo de meses — carteiras novas ou com meses sem repasse não
  // podem puxar a média pra baixo dividindo por meses vazios).
  const transportePorPeriodo = new Map<string, number>();
  // Sua comissão (não faz sentido pra admin, que soma vários vendedores) —
  // mesmo período, ponderado pelo comissao_pct de cada produção.
  const transporteVendedorPorPeriodo = new Map<string, number>();
  for (const r of allRows) {
    if (r.repasses_lotes?.status !== "pago") continue; // repasse só conta como recebido de fato quando o lote foi pago
    // Mês de competência do pagamento é o mês em que o lote termina
    // (periodo_fim), não o mês tageado em cada repasse individual (que vem
    // do início do relatório) — mesmo critério usado em todo o resto desta
    // página pra "pago", senão um lote pago em outubro mas cujo relatório
    // começou em setembro era contado como receita de setembro.
    const mesCompetencia = r.repasses_lotes.periodo_fim?.slice(0, 7) ?? r.periodo;
    if (mesCompetencia >= atual) continue; // equivalente ao antigo .lt("periodo", atual)
    if (!r.producoes?.tipos_produto?.nome?.toUpperCase().includes("TRANSPORTE")) continue;
    const recebido = Number(r.comissao_bruta ?? 0);
    transportePorPeriodo.set(mesCompetencia, (transportePorPeriodo.get(mesCompetencia) ?? 0) + recebido);
    const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
    transporteVendedorPorPeriodo.set(mesCompetencia, (transporteVendedorPorPeriodo.get(mesCompetencia) ?? 0) + recebido * pct);
  }
  const mesesTransporteComComissao = [...transportePorPeriodo.keys()].filter((k) => (transportePorPeriodo.get(k) ?? 0) > 0);
  const previsaoTransporte = mesesTransporteComComissao.length > 0
    ? mesesTransporteComComissao.reduce((a, k) => a + (transportePorPeriodo.get(k) ?? 0), 0) / mesesTransporteComComissao.length
    : 0;
  const previsaoSuaComissao = mesesTransporteComComissao.length > 0
    ? mesesTransporteComComissao.reduce((a, k) => a + (transporteVendedorPorPeriodo.get(k) ?? 0), 0) / mesesTransporteComComissao.length
    : 0;

  let comissaoBruta = 0;
  let suaComissao = 0;
  let previsao = false;
  // Já faturado (NF emitida e autorizada) mas ainda sem pagamento confirmado
  // — repasses_lotes.status só chega em "aguardando_pagamento" depois que a
  // NFS-e é autorizada (ver transmitir() em notas-fiscais/actions.ts).
  let aguardandoBruta = 0;
  let aguardandoComissao = 0;

  if (isFuturo) {
    previsao = true;
    comissaoBruta = previsaoTransporte;
    suaComissao = previsaoSuaComissao;
  } else {
    for (const r of allRows) {
      const bruto = Number(r.comissao_bruta ?? 0);
      const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
      // "Pago" também bucketa pelo mês em que o lote termina (periodo_fim),
      // não pelo r.periodo tageado em cada repasse — mesmo critério do
      // "aguardando" logo abaixo e do fecharMes().
      if (r.repasses_lotes?.status === "pago" && (r.repasses_lotes.periodo_fim?.slice(0, 7) ?? r.periodo) === periodo) {
        comissaoBruta += bruto;
        suaComissao += bruto * pct;
      }
      // O lote "pertence" ao mês em que seu período termina, não ao mês
      // em que cada repasse individual foi tageado — mesmo critério do
      // fecharMes() (ver financeiro/actions.ts), senão um lote que cobre
      // 11/09 a 09/10 (faturado com competência de outubro) aparecia como
      // pendência de setembro.
      if (r.repasses_lotes?.status === "aguardando_pagamento" && r.repasses_lotes.periodo_fim?.slice(0, 7) === periodo) {
        aguardandoBruta += bruto;
        aguardandoComissao += bruto * pct;
      }
    }
  }

  const aliquota = Number(settingsRow?.aliquota_simples ?? 6);
  const simples = comissaoBruta * (aliquota / 100);

  // Evolução mês a mês (últimos 12 meses, incluindo o atual) — faturamento
  // bruto pro admin, comissão já ponderada pela % de cada produção pro
  // vendedor.
  const faturamentoPorMes = new Map(mesesEvolucao.map((m) => [m, 0]));
  const comissaoPorMes = new Map(mesesEvolucao.map((m) => [m, 0]));
  // Total do ano corrente e histórico desde sempre — não ficam restritos à
  // janela de 12 meses do gráfico, por isso somados num loop à parte sobre
  // todos os repasses pagos.
  const anoAtual = atual.slice(0, 4);
  let faturamentoAno = 0;
  let comissaoAno = 0;
  let faturamentoTotal = 0;
  let comissaoTotal = 0;
  for (const r of allRows) {
    if (r.repasses_lotes?.status !== "pago") continue;
    const bruto = Number(r.comissao_bruta ?? 0);
    const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
    const mesCompetencia = r.repasses_lotes.periodo_fim?.slice(0, 7) ?? r.periodo;
    if (faturamentoPorMes.has(mesCompetencia)) {
      faturamentoPorMes.set(mesCompetencia, (faturamentoPorMes.get(mesCompetencia) ?? 0) + bruto);
      comissaoPorMes.set(mesCompetencia, (comissaoPorMes.get(mesCompetencia) ?? 0) + bruto * pct);
    }
    faturamentoTotal += bruto;
    comissaoTotal += bruto * pct;
    if (mesCompetencia.startsWith(anoAtual)) {
      faturamentoAno += bruto;
      comissaoAno += bruto * pct;
    }
  }
  const evolucaoFaturamento = mesesEvolucao.map((periodo) => ({ periodo, valor: faturamentoPorMes.get(periodo) ?? 0 }));
  const evolucaoComissao = mesesEvolucao.map((periodo) => ({ periodo, valor: comissaoPorMes.get(periodo) ?? 0 }));

  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const amanhaStr = new Date(hoje.getTime() + 86400000).toISOString().slice(0, 10);
  const em30dias = new Date(hoje.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const apolicesVencendo = producoesAtivas.filter((p) => p.vigencia_fim && p.vigencia_fim >= hojeStr && p.vigencia_fim <= em30dias);
  const tarefasVencidas = tarefas.filter((t) => !t.concluida && t.data < hojeStr);
  const aniversariosProximos = tarefas.filter((t) => t.tipo === "aniversario" && !t.concluida);
  const tarefasHoje = tarefas.filter((t) => !t.concluida && t.data === hojeStr);
  const tarefasAmanha = tarefas.filter((t) => !t.concluida && t.data === amanhaStr);

  // Painel "de CEO": só pra admin (vendedor não precisa ver a carteira toda).
  let topProdutos: { label: string; valor: number }[] = [];
  let topClientes: { label: string; valor: number }[] = [];
  let topSeguradoras: { label: string; valor: number }[] = [];
  let metaValor = 0;
  const numDiasMes = diasNoMes(atual);
  const diaAtualMes = diaDoMes(hojeStr);
  let faturadoAcumulado: number[] = [];

  if (isAdmin) {
    const porProduto = new Map<string, number>();
    const porCliente = new Map<string, number>();
    const porSeguradora = new Map<string, number>();
    for (const r of allRows) {
      if (r.repasses_lotes?.status !== "pago") continue;
      const valor = Number(r.comissao_bruta ?? 0);
      const nomeProduto = r.producoes?.tipos_produto?.nome ?? "Outro";
      const nomeCliente = r.producoes?.clientes?.nome ?? "Cliente";
      const nomeSeguradora = r.producoes?.seguradoras?.nome ?? "Outra";
      porProduto.set(nomeProduto, (porProduto.get(nomeProduto) ?? 0) + valor);
      porCliente.set(nomeCliente, (porCliente.get(nomeCliente) ?? 0) + valor);
      porSeguradora.set(nomeSeguradora, (porSeguradora.get(nomeSeguradora) ?? 0) + valor);
    }
    topProdutos = [...porProduto.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, valor]) => ({ label, valor }));
    topClientes = [...porCliente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, valor]) => ({ label, valor }));
    topSeguradoras = [...porSeguradora.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, valor]) => ({ label, valor }));

    const lotesTodos = (lotesTodosRaw ?? []) as Array<{
      status: string;
      comissao_bruta_total: number | null;
      valor_pago: number | null;
      data_pagamento: string | null;
      periodo_fim: string | null;
    }>;
    const lotesPagos = lotesTodos.filter((l) => l.status === "pago");

    const valorPorMes = new Map<string, number>();
    for (const l of lotesPagos) {
      if (!l.data_pagamento) continue;
      const mesPagamento = l.data_pagamento.slice(0, 7);
      if (mesPagamento === atual) continue; // mês corrente ainda está incompleto
      valorPorMes.set(mesPagamento, (valorPorMes.get(mesPagamento) ?? 0) + Number(l.valor_pago ?? 0));
    }
    const mediasHistoricas = [...valorPorMes.values()];
    const metaSugerida = mediasHistoricas.length > 0
      ? Math.round((mediasHistoricas.reduce((a, b) => a + b, 0) / mediasHistoricas.length) * 100) / 100
      : 0;

    if (metaRow) {
      metaValor = metaRow.valor;
    } else {
      const { data: metaCriada } = await supabase
        .from("metas_mensais")
        .insert({ periodo: atual, valor: metaSugerida, gerado_automaticamente: true })
        .select("*")
        .single();
      metaValor = metaCriada?.valor ?? metaSugerida;
    }

    const faturadoAcumuladoCompleto = new Array(numDiasMes).fill(0);
    for (const l of lotesPagos) {
      if (!l.data_pagamento || !l.data_pagamento.startsWith(atual)) continue;
      const dia = diaDoMes(l.data_pagamento);
      for (let d = dia - 1; d < numDiasMes; d++) faturadoAcumuladoCompleto[d] += Number(l.valor_pago ?? 0);
    }
    faturadoAcumulado = faturadoAcumuladoCompleto.slice(0, diaAtualMes);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {usuario.nome.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Visão geral da Avantar" : "Visão geral da sua carteira"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/?mes=${shiftPeriodo(periodo, -1)}`}>
            <Button type="button" variant="outline" size="icon"><ChevronLeft className="size-4" /></Button>
          </Link>
          <Link
            href="/"
            title="Voltar para o mês atual"
            className="min-w-28 rounded-md px-2 py-1 text-center text-sm font-medium capitalize hover:bg-muted"
          >
            {mesLabel(periodo)}
          </Link>
          <Link href={`/?mes=${shiftPeriodo(periodo, 1)}`}>
            <Button type="button" variant="outline" size="icon"><ChevronRight className="size-4" /></Button>
          </Link>
        </div>
      </div>

      {previsao && (
        <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          Modo previsão — estimativa baseada na média dos meses com comissão de transporte recebida.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isAdmin
                ? previsao ? "Comissão prevista" : "Comissão recebida"
                : previsao ? "Faturado previsto (carteira)" : "Faturado (carteira)"}
            </CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtMoney(comissaoBruta)}</div>
            {!isAdmin && (
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Total recebido da sua carteira — antes da sua comissão.
              </p>
            )}
            {!previsao && aguardandoBruta > 0 && (
              <p className="mt-0.5 text-[11px] text-warning">
                + {fmtMoney(aguardandoBruta)} aguardando pagamento (NF já emitida)
              </p>
            )}
          </CardContent>
        </Card>
        {isAdmin ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Simples Nacional</CardTitle>
              <Wallet className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{fmtMoney(simples)}</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-success/30 bg-success/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {previsao ? "Sua comissão (prevista)" : "Sua comissão"}
              </CardTitle>
              <Wallet className="size-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-success">{fmtMoney(suaComissao)}</div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">O que cai no seu bolso, já aplicando a sua % em cada produção.</p>
              {!previsao && aguardandoComissao > 0 && (
                <p className="mt-0.5 text-[11px] text-warning">
                  + {fmtMoney(aguardandoComissao)} aguardando pagamento (NF já emitida)
                </p>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Produções ativas</CardTitle>
            <ShieldCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{producoesAtivas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {isAdmin ? "Clientes ativos" : "Meus clientes ativos"}
            </CardTitle>
            <Building2 className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{clientesAtivos ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className={isAdmin ? "grid gap-4 md:grid-cols-2" : undefined}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-primary" />
              {isAdmin ? "Faturamento mês a mês" : "Sua comissão mês a mês"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <MonthlyBarChart dados={isAdmin ? evolucaoFaturamento : evolucaoComissao} cor={isAdmin ? "primary" : "success"} />
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Total em {anoAtual}</div>
                <div className="text-lg font-bold">{fmtMoney(isAdmin ? faturamentoAno : comissaoAno)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Total histórico</div>
                <div className="text-lg font-bold">{fmtMoney(isAdmin ? faturamentoTotal : comissaoTotal)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="size-4 text-primary" /> Meta de {mesLabel(atual)}
              </CardTitle>
              <MetaDialogForm periodo={atual} valorAtual={metaValor} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Meta</div>
                  <div className="text-lg font-bold">{fmtMoney(metaValor)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Faturado até hoje</div>
                  <div className="text-lg font-bold text-success">{fmtMoney(faturadoAcumulado[faturadoAcumulado.length - 1] ?? 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tarefas de hoje</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tarefasHoje.length === 0 && <p className="text-sm text-muted-foreground">Nada pra hoje. 🎉</p>}
            {tarefasHoje.map((t) => (
              <Link key={t.id} href={t.href ?? "/tarefas"} className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary">
                {t.titulo}
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Tarefas de amanhã</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2">
            {tarefasAmanha.length === 0 && <p className="text-sm text-muted-foreground">Nada por enquanto.</p>}
            {tarefasAmanha.map((t) => (
              <Link key={t.id} href={t.href ?? "/tarefas"} className="rounded-md border border-border px-3 py-2 text-sm hover:border-primary">
                {t.titulo}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="size-4 text-primary" /> CRM — visão rápida
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prospecções em aberto</span>
              <span className="font-semibold">{prospeccoesAbertas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Follow-ups atrasados</span>
              <span className="font-semibold text-destructive">
                {tarefasVencidas.filter((t) => t.tipo === "followup").length}
              </span>
            </div>
            <Link href="/crm" className="text-xs text-primary hover:underline">Ver CRM completo →</Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Apólices vencendo (30d)</span>
              <span className="font-semibold">{apolicesVencendo.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tarefas vencidas</span>
              <span className="font-semibold text-destructive">{tarefasVencidas.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1"><Cake className="size-3" /> Aniversários (365d)</span>
              <span className="font-semibold">{aniversariosProximos.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Produtos com maior faturamento</CardTitle></CardHeader>
            <CardContent><RankingList itens={topProdutos} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Clientes com maior faturamento</CardTitle></CardHeader>
            <CardContent><RankingList itens={topClientes} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Seguradoras com maior faturamento</CardTitle></CardHeader>
            <CardContent><RankingList itens={topSeguradoras} /></CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" /> Calendário
          </CardTitle>
          <Link href="/tarefas" className="text-xs text-primary hover:underline">Ver tarefas completo →</Link>
        </CardHeader>
        <CardContent>
          <MonthCalendar tarefas={tarefas} compact />
        </CardContent>
      </Card>

      {apolicesVencendo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apólices vencendo em breve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {apolicesVencendo.map((p) => (
              <Link
                key={p.id}
                href={`/producoes/${p.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:border-primary"
              >
                <span className="font-medium">{p.clientes?.nome ?? "Cliente"}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  vence em {fmtDate(p.vigencia_fim)}
                  <StatusBadge status={p.status_manual} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
