import Link from "next/link";
import { ChevronLeft, ChevronRight, Lock, LockOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/shared/link-button";
import { DespesaDialogForm } from "@/components/financeiro/despesa-dialog-form";
import { DespesasList } from "@/components/financeiro/despesas-list";
import { SettingsDialogForm } from "@/components/financeiro/settings-dialog-form";
import { FecharMesDialogForm } from "@/components/financeiro/fechar-mes-dialog-form";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtMoney, mesLabel, shiftPeriodo, periodoAtual } from "@/lib/format";
import { periodosParcelada } from "@/lib/despesas-tarefas";
import type { FechamentoMensal } from "@/types/database";
import { createDespesa, reabrirMes } from "./actions";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; inicio?: string; fim?: string; tudo?: string }>;
}) {
  const { mes, inicio, fim, tudo } = await searchParams;
  const modoIntervalo = Boolean(inicio && fim);
  const modoTudo = tudo === "1";
  const periodo = mes || periodoAtual();

  const supabase = await createClient();
  const [{ data: repasses }, { data: despesas }, { data: pagamentos }, { data: settingsRow }, { data: fechamentoRow }, { data: historicoValores }] = await Promise.all([
    modoIntervalo || modoTudo
      ? supabase.from("repasses").select("*, producoes(comissao_pct), repasses_lotes(status, data_pagamento)")
      : supabase.from("repasses").select("*, producoes(comissao_pct), repasses_lotes(status)").eq("periodo", periodo),
    supabase.from("despesas").select("*").eq("ativa", true).order("descricao"),
    modoIntervalo || modoTudo
      ? Promise.resolve({ data: [] as { despesa_id: string }[] })
      : supabase.from("despesas_pagamentos").select("*").eq("periodo", periodo),
    supabase.from("settings").select("*").eq("id", true).single(),
    modoIntervalo || modoTudo
      ? Promise.resolve({ data: null as FechamentoMensal | null })
      : supabase.from("fechamentos_mensais").select("*").eq("periodo", periodo).maybeSingle(),
    supabase.from("despesas_historico_valores").select("*"),
  ]);
  const fechamento = fechamentoRow as FechamentoMensal | null;
  const estaFechado = Boolean(fechamento?.fechado_em);

  const settings = settingsRow ?? { id: true as const, aliquota_simples: 6, meta_mensal: 15000, updated_at: "" };
  const pagasNoMes = new Set((pagamentos ?? []).map((p) => p.despesa_id));

  const rowsRaw = (repasses ?? []) as unknown as Array<{
    comissao_bruta: number | null;
    producoes: { comissao_pct: number | null } | null;
    repasses_lotes: { status: string; data_pagamento?: string | null } | null;
  }>;
  const rows = modoIntervalo
    ? rowsRaw.filter((r) => {
        const dp = r.repasses_lotes?.data_pagamento;
        return dp && dp >= inicio! && dp <= fim!;
      })
    : rowsRaw;

  const comissaoBruta = rows.reduce((sum, r) => sum + (r.repasses_lotes?.status === "pago" ? Number(r.comissao_bruta ?? 0) : 0), 0);
  const simples = estaFechado && fechamento?.das_valor != null ? Number(fechamento.das_valor) : comissaoBruta * (Number(settings.aliquota_simples) / 100);
  const comissaoLiquida = comissaoBruta - simples;

  // Valor de uma despesa fixa/parcelada num período específico: pega o
  // histórico mais recente com periodo <= o período pedido — assim, alterar
  // o valor hoje só afeta o mês vigente e os futuros, meses já fechados
  // continuam com o valor que valia neles.
  function valorNoPeriodo(despesaId: string, valorAtual: number, periodoAlvo: string): number {
    const registros = (historicoValores ?? []).filter((h) => h.despesa_id === despesaId && h.periodo <= periodoAlvo);
    if (registros.length === 0) return valorAtual;
    return Number(registros.sort((a, b) => b.periodo.localeCompare(a.periodo))[0].valor);
  }

  const despesasFixas = (despesas ?? []).filter((d) => d.tipo === "fixa");
  const despesasParceladas = (despesas ?? []).filter((d) => {
    if (d.tipo !== "parcelada" || !d.parcela_inicio || !d.parcelas_total) return false;
    const periodos = periodosParcelada(d.parcela_inicio, d.parcelas_total);
    if (modoTudo) return true;
    if (modoIntervalo) return periodos.some((p) => p >= inicio!.slice(0, 7) && p <= fim!.slice(0, 7));
    return periodos.includes(periodo);
  });
  const despesasVariaveis = (despesas ?? []).filter((d) => {
    if (d.tipo !== "variavel" || !d.data) return false;
    if (modoTudo) return true;
    if (modoIntervalo) return d.data >= inicio! && d.data <= fim!;
    return d.data.slice(0, 7) === periodo;
  });
  const totalFixas = despesasFixas.reduce(
    (s, d) => s + (modoIntervalo || modoTudo ? Number(d.valor) : valorNoPeriodo(d.id, d.valor, periodo)),
    0,
  );
  // Diferente de "fixas" (mesmo valor todo mês, por isso o total nessas
  // visões representa só a taxa mensal — daí o rótulo "(mensal)"), uma
  // parcelada só existe nos meses da sua janela: o total tem que contar
  // quantas parcelas caem dentro do período/intervalo selecionado.
  const totalParceladas = despesasParceladas.reduce((s, d) => {
    if (modoIntervalo || modoTudo) {
      const periodos = periodosParcelada(d.parcela_inicio!, d.parcelas_total!);
      const qtdNoRecorte = modoTudo
        ? periodos.length
        : periodos.filter((p) => p >= inicio!.slice(0, 7) && p <= fim!.slice(0, 7)).length;
      return s + Number(d.valor) * qtdNoRecorte;
    }
    return s + valorNoPeriodo(d.id, d.valor, periodo);
  }, 0);
  const totalVariaveis = despesasVariaveis.reduce((s, d) => s + Number(d.valor), 0);
  const categoriasExistentes = Array.from(new Set((despesas ?? []).map((d) => d.categoria).filter((c): c is string => Boolean(c))));

  const comissoesVendedores = rows.reduce((sum, r) => {
    if (r.repasses_lotes?.status !== "pago") return sum;
    const base = Number(r.comissao_bruta ?? 0);
    const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
    return sum + base * pct;
  }, 0);

  const resultado = comissaoLiquida - totalFixas - totalParceladas - totalVariaveis - comissoesVendedores;

  const tituloPeriodo = modoTudo
    ? "todo o período"
    : modoIntervalo
      ? `${inicio!.split("-").reverse().join("/")} a ${fim!.split("-").reverse().join("/")}`
      : mesLabel(periodo);

  const linhas: [string, number, boolean?][] = [
    ["Comissões (bruto)", comissaoBruta],
    [estaFechado ? "Simples Nacional (DAS pago)" : `Simples Nacional (${settings.aliquota_simples}% estimado)`, -simples],
    ["Comissão líquida", comissaoLiquida, true],
    [`Despesas fixas${modoIntervalo || modoTudo ? " (mensal)" : ""}`, -totalFixas],
    ["Despesas parceladas", -totalParceladas],
    ["Despesas variáveis", -totalVariaveis],
    ["Comissões vendedores", -comissoesVendedores],
    ["Resultado", resultado, true],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <div className="flex items-center gap-2">
          {!modoIntervalo && !modoTudo && (
            <>
              <Link href={`/financeiro?mes=${shiftPeriodo(periodo, -1)}`}>
                <Button type="button" variant="outline" size="icon"><ChevronLeft className="size-4" /></Button>
              </Link>
              <Link
                href={`/financeiro?mes=${periodoAtual()}`}
                title="Voltar para o mês atual"
                className="min-w-32 rounded-md px-2 py-1 text-center text-sm font-medium capitalize hover:bg-muted"
              >
                {mesLabel(periodo)}
              </Link>
              <Link href={`/financeiro?mes=${shiftPeriodo(periodo, 1)}`}>
                <Button type="button" variant="outline" size="icon"><ChevronRight className="size-4" /></Button>
              </Link>
            </>
          )}
          <SettingsDialogForm settings={settings} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-3">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inicio" className="text-xs">De</Label>
            <Input id="inicio" name="inicio" type="date" defaultValue={inicio} className="w-40" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fim" className="text-xs">Até</Label>
            <Input id="fim" name="fim" type="date" defaultValue={fim} className="w-40" />
          </div>
          <Button type="submit" size="sm">Filtrar período</Button>
        </form>
        <LinkButton href="/financeiro?tudo=1" variant="outline" size="sm">Ver tudo</LinkButton>
        {(modoIntervalo || modoTudo || mes) && (
          <LinkButton href="/financeiro" variant="ghost" size="sm">Limpar filtros</LinkButton>
        )}
      </div>

      {!modoIntervalo && !modoTudo && (
        <Card className={estaFechado ? "border-success/30 bg-success/5" : undefined}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {estaFechado ? (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 font-medium text-success">
                    <Lock className="size-4" /> Mês fechado em {fmtDate(fechamento!.fechado_em!.slice(0, 10))}
                  </span>
                  <span className="text-muted-foreground">
                    DAS {fechamento?.das_numero_documento || "—"} · vencimento {fmtDate(fechamento?.das_vencimento)} · {fmtMoney(fechamento?.das_valor)}
                  </span>
                  {fechamento?.das_arquivo_nome && (
                    <a href={`/financeiro/das/${periodo}`} className="text-primary hover:underline">Baixar DAS</a>
                  )}
                </div>
                <form action={reabrirMes.bind(null, periodo)}>
                  <Button type="submit" variant="outline" size="sm">
                    <LockOpen className="size-4" /> Reabrir mês
                  </Button>
                </form>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Já recebeu tudo desse mês e pagou o DAS? Feche o mês pra travar o resultado com o valor real do Simples.
                </p>
                <FecharMesDialogForm periodo={periodo} fechamento={fechamento} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">DRE — {tituloPeriodo}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {linhas.map(([label, valor, destaque]) => (
            <div key={label} className={`flex items-center justify-between py-2 text-sm ${destaque ? "font-semibold" : "text-muted-foreground"}`}>
              <span>{label}</span>
              <span className={valor < 0 ? "text-destructive" : destaque ? "text-success" : ""}>{fmtMoney(valor)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Despesas</CardTitle>
          <DespesaDialogForm action={createDespesa} categoriasExistentes={categoriasExistentes} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DespesasList despesas={despesasFixas} pagasNoMes={pagasNoMes} periodo={periodo} titulo="Fixas" categoriasExistentes={categoriasExistentes} permiteMarcarPago={!modoIntervalo && !modoTudo} />
          <DespesasList despesas={despesasParceladas} pagasNoMes={pagasNoMes} periodo={periodo} titulo="Parceladas do período" categoriasExistentes={categoriasExistentes} permiteMarcarPago={!modoIntervalo && !modoTudo} />
          <DespesasList despesas={despesasVariaveis} pagasNoMes={pagasNoMes} periodo={periodo} titulo="Variáveis do período" categoriasExistentes={categoriasExistentes} permiteMarcarPago={!modoIntervalo && !modoTudo} />
          {despesasFixas.length === 0 && despesasParceladas.length === 0 && despesasVariaveis.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
