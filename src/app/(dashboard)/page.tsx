import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, Cake, MessagesSquare, Wallet, ShieldCheck, Building2, Target, CalendarDays } from "lucide-react";
import { MonthCalendar } from "@/components/tarefas/month-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RankingList } from "@/components/dashboard/ranking-list";
import { MetaDialogForm } from "@/components/dashboard/meta-dialog-form";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney, fmtDate, periodoAtual, shiftPeriodo, mesLabel, diasNoMes, diaDoMes } from "@/lib/format";
import { todasTarefas } from "@/lib/tarefas";
import type { ProducaoRow } from "@/components/producoes/producao-table";

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

  // RLS já restringe o que vem de volta (vendedor só vê as próprias
  // produções — ver supabase/migrations/0001_core.sql), sem precisar
  // filtrar de novo aqui.
  const [{ data: producoesRaw }, { count: clientesAtivos }, tarefas] = await Promise.all([
    supabase.from("producoes").select("*, clientes(nome)"),
    isAdmin
      ? supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "ativo")
      : Promise.resolve({ count: null as number | null }),
    todasTarefas(supabase, { horizonteDias: 400 }),
  ]);
  const producoes = (producoesRaw ?? []) as unknown as ProducaoRow[];

  const producoesAtivas = producoes.filter((p) => p.status_manual === "ativa");

  // Previsão de faturamento do ramo Transporte: comissão é recorrente mês a
  // mês por apólice, então a projeção pro próximo mês é a média de TODOS os
  // meses fechados que já tiveram comissão de transporte recebida (não um
  // número fixo de meses — carteiras novas ou com meses sem repasse não
  // podem puxar a média pra baixo dividindo por meses vazios).
  const { data: repassesTransporte } = await supabase
    .from("repasses")
    .select("*, producoes(tipo_produto_id, tipos_produto(nome)), repasses_lotes(status)")
    .lt("periodo", atual);
  const transporteRows = (repassesTransporte ?? []) as unknown as Array<{
    periodo: string;
    comissao_bruta: number | null;
    producoes: { tipos_produto: { nome: string } | null } | null;
    repasses_lotes: { status: string } | null;
  }>;
  const transportePorPeriodo = new Map<string, number>();
  for (const r of transporteRows) {
    if (!r.producoes?.tipos_produto?.nome?.toUpperCase().includes("TRANSPORTE")) continue;
    if (r.repasses_lotes?.status !== "pago") continue; // repasse só conta como recebido de fato quando o lote foi pago
    const recebido = Number(r.comissao_bruta ?? 0);
    transportePorPeriodo.set(r.periodo, (transportePorPeriodo.get(r.periodo) ?? 0) + recebido);
  }
  const mesesTransporteComComissao = [...transportePorPeriodo.values()].filter((v) => v > 0);
  const previsaoTransporte = mesesTransporteComComissao.length > 0
    ? mesesTransporteComComissao.reduce((a, b) => a + b, 0) / mesesTransporteComComissao.length
    : 0;

  let comissaoBruta = 0;
  let previsao = false;

  if (isFuturo) {
    previsao = true;
    comissaoBruta = previsaoTransporte;
  } else {
    const { data: repassesMes } = await supabase
      .from("repasses")
      .select("*, repasses_lotes(status)")
      .eq("periodo", periodo);
    const rowsMes = (repassesMes ?? []) as unknown as Array<{
      comissao_bruta: number | null;
      repasses_lotes: { status: string } | null;
    }>;
    comissaoBruta = rowsMes.reduce(
      (sum, r) => sum + (r.repasses_lotes?.status === "pago" ? Number(r.comissao_bruta ?? 0) : 0),
      0,
    );
  }

  const { data: settingsRow } = await supabase.from("settings").select("*").eq("id", true).single();
  const aliquota = Number(settingsRow?.aliquota_simples ?? 6);
  const simples = comissaoBruta * (aliquota / 100);
  const resultado = comissaoBruta - simples;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const amanhaStr = new Date(hoje.getTime() + 86400000).toISOString().slice(0, 10);
  const em30dias = new Date(hoje.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const apolicesVencendo = producoesAtivas.filter((p) => p.vigencia_fim && p.vigencia_fim >= hojeStr && p.vigencia_fim <= em30dias);
  const tarefasVencidas = tarefas.filter((t) => !t.concluida && t.data < hojeStr);
  const aniversariosProximos = tarefas.filter((t) => t.tipo === "aniversario" && !t.concluida);
  const tarefasHoje = tarefas.filter((t) => !t.concluida && t.data === hojeStr);
  const tarefasAmanha = tarefas.filter((t) => !t.concluida && t.data === amanhaStr);

  const { count: prospeccoesAbertasCount } = await supabase
    .from("prospeccoes")
    .select("*", { count: "exact", head: true })
    .neq("coluna_id", "fechado")
    .neq("coluna_id", "perdido");
  const prospeccoesAbertas = prospeccoesAbertasCount ?? 0;

  // Painel "de CEO": só pra admin (vendedor não precisa ver a carteira toda).
  let topProdutos: { label: string; valor: number }[] = [];
  let topClientes: { label: string; valor: number }[] = [];
  let topSeguradoras: { label: string; valor: number }[] = [];
  let metaValor = 0;
  const numDiasMes = diasNoMes(atual);
  const diaAtualMes = diaDoMes(hojeStr);
  let faturadoAcumulado: number[] = [];

  if (isAdmin) {
    const [{ data: repassesTodos }, { data: lotesTodosRaw }, { data: metaRow }] = await Promise.all([
      supabase
        .from("repasses")
        .select("*, producoes(cliente_id, tipo_produto_id, clientes(nome), tipos_produto(nome), seguradoras(nome)), repasses_lotes(status)"),
      supabase.from("repasses_lotes").select("*"),
      supabase.from("metas_mensais").select("*").eq("periodo", atual).maybeSingle(),
    ]);

    const repassesRows = (repassesTodos ?? []) as unknown as Array<{
      comissao_bruta: number | null;
      producoes: { clientes: { nome: string } | null; tipos_produto: { nome: string } | null; seguradoras: { nome: string } | null } | null;
      repasses_lotes: { status: string } | null;
    }>;
    const porProduto = new Map<string, number>();
    const porCliente = new Map<string, number>();
    const porSeguradora = new Map<string, number>();
    for (const r of repassesRows) {
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
              {previsao ? "Comissão prevista" : "Comissão recebida"}
            </CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtMoney(comissaoBruta)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Simples Nacional</CardTitle>
            <Wallet className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtMoney(simples)}</div>
          </CardContent>
        </Card>
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
              {isAdmin ? "Clientes ativos" : "Resultado estimado"}
            </CardTitle>
            {isAdmin ? <Building2 className="size-4 text-primary" /> : <Wallet className="size-4 text-success" />}
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{isAdmin ? clientesAtivos ?? 0 : fmtMoney(resultado)}</div>
          </CardContent>
        </Card>
      </div>

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
