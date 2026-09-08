import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DespesaDialogForm } from "@/components/financeiro/despesa-dialog-form";
import { DespesasList } from "@/components/financeiro/despesas-list";
import { SettingsDialogForm } from "@/components/financeiro/settings-dialog-form";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/format";
import { createDespesa } from "./actions";

function mesLabel(periodo: string) {
  const [y, m] = periodo.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
function shiftPeriodo(periodo: string, delta: number) {
  const [y, m] = periodo.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const now = new Date();
  const periodo = mes || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const supabase = await createClient();
  const [{ data: repasses }, { data: despesas }, { data: pagamentos }, { data: settingsRow }] = await Promise.all([
    supabase.from("repasses").select("*, producoes(comissao_pct)").eq("periodo", periodo),
    supabase.from("despesas").select("*").eq("ativa", true).order("descricao"),
    supabase.from("despesas_pagamentos").select("*").eq("periodo", periodo),
    supabase.from("settings").select("*").eq("id", true).single(),
  ]);

  const settings = settingsRow ?? { id: true as const, aliquota_simples: 6, meta_mensal: 15000, updated_at: "" };
  const pagasNoMes = new Set((pagamentos ?? []).map((p) => p.despesa_id));

  const rows = (repasses ?? []) as unknown as Array<{
    comissao_bruta: number | null;
    valor_pago: number | null;
    status: string;
    producoes: { comissao_pct: number | null } | null;
  }>;

  const comissaoBruta = rows.reduce((sum, r) => sum + Number(r.status === "pago" ? r.valor_pago ?? r.comissao_bruta : r.comissao_bruta ?? 0), 0);
  const simples = comissaoBruta * (Number(settings.aliquota_simples) / 100);
  const comissaoLiquida = comissaoBruta - simples;

  const despesasFixas = (despesas ?? []).filter((d) => d.tipo === "fixa");
  const despesasVariaveis = (despesas ?? []).filter((d) => d.tipo === "variavel" && d.data?.slice(0, 7) === periodo);
  const totalFixas = despesasFixas.reduce((s, d) => s + Number(d.valor), 0);
  const totalVariaveis = despesasVariaveis.reduce((s, d) => s + Number(d.valor), 0);

  const comissoesVendedores = rows.reduce((sum, r) => {
    const base = Number(r.status === "pago" ? r.valor_pago ?? r.comissao_bruta : r.comissao_bruta ?? 0);
    const pct = Number(r.producoes?.comissao_pct ?? 0) / 100;
    return sum + base * pct;
  }, 0);

  const resultado = comissaoLiquida - totalFixas - totalVariaveis - comissoesVendedores;

  const linhas: [string, number, boolean?][] = [
    ["Comissões (bruto)", comissaoBruta],
    [`Simples Nacional (${settings.aliquota_simples}%)`, -simples],
    ["Comissão líquida", comissaoLiquida, true],
    ["Despesas fixas", -totalFixas],
    ["Despesas variáveis", -totalVariaveis],
    ["Comissões vendedores", -comissoesVendedores],
    ["Resultado", resultado, true],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Financeiro</h1>
        <div className="flex items-center gap-2">
          <Link href={`/financeiro?mes=${shiftPeriodo(periodo, -1)}`}>
            <Button type="button" variant="outline" size="icon"><ChevronLeft className="size-4" /></Button>
          </Link>
          <span className="min-w-32 text-center text-sm font-medium capitalize">{mesLabel(periodo)}</span>
          <Link href={`/financeiro?mes=${shiftPeriodo(periodo, 1)}`}>
            <Button type="button" variant="outline" size="icon"><ChevronRight className="size-4" /></Button>
          </Link>
          <SettingsDialogForm settings={settings} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DRE — {mesLabel(periodo)}</CardTitle>
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
          <DespesaDialogForm action={createDespesa} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DespesasList despesas={despesasFixas} pagasNoMes={pagasNoMes} periodo={periodo} titulo="Fixas" />
          <DespesasList despesas={despesasVariaveis} pagasNoMes={pagasNoMes} periodo={periodo} titulo="Variáveis do mês" />
          {despesasFixas.length === 0 && despesasVariaveis.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
