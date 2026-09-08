import Link from "next/link";
import { ChevronLeft, ChevronRight, AlertTriangle, Cake, MessagesSquare, Wallet, ShieldCheck, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney, fmtDate, periodoAtual } from "@/lib/format";
import { todasTarefas } from "@/lib/tarefas";
import type { ProducaoRow } from "@/components/producoes/producao-table";

function shiftPeriodo(periodo: string, delta: number) {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(periodo: string) {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

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

  let comissaoBruta = 0;
  let previsao = false;

  if (isFuturo) {
    // Modo previsão: média dos repasses de TRANSPORTE-TR dos últimos 3
    // meses reais (mesma regra do legacy: previsaoFaturamento()).
    previsao = true;
    const meses = [shiftPeriodo(atual, -1), shiftPeriodo(atual, -2), shiftPeriodo(atual, -3)];
    const { data: repassesTr } = await supabase
      .from("repasses")
      .select("*, producoes(tipo_produto_id, tipos_produto(nome))")
      .in("periodo", meses);
    const rows = (repassesTr ?? []) as unknown as Array<{
      comissao_bruta: number | null;
      producoes: { tipos_produto: { nome: string } | null } | null;
    }>;
    const totalTr = rows
      .filter((r) => r.producoes?.tipos_produto?.nome?.toUpperCase().includes("TRANSPORTE"))
      .reduce((sum, r) => sum + Number(r.comissao_bruta ?? 0), 0);
    comissaoBruta = totalTr / 3;
  } else {
    const { data: repassesMes } = await supabase.from("repasses").select("*").eq("periodo", periodo);
    comissaoBruta = (repassesMes ?? []).reduce(
      (sum, r) => sum + Number(r.status === "pago" ? r.valor_pago ?? r.comissao_bruta : r.comissao_bruta ?? 0),
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
          <span className="min-w-28 text-center text-sm font-medium capitalize">{mesLabel(periodo)}</span>
          <Link href={`/?mes=${shiftPeriodo(periodo, 1)}`}>
            <Button type="button" variant="outline" size="icon"><ChevronRight className="size-4" /></Button>
          </Link>
        </div>
      </div>

      {previsao && (
        <p className="rounded-md border border-info/30 bg-info/10 px-3 py-2 text-xs text-info">
          Modo previsão — estimativa baseada na média dos últimos 3 meses de repasses de transporte.
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
