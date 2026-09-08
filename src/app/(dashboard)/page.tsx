import { Building2, ShieldCheck, Wallet, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtMoney } from "@/lib/format";
import type { ProducaoRow } from "@/components/producoes/producao-table";

export default async function DashboardPage() {
  const usuario = await requireCurrentUsuario();
  const supabase = await createClient();

  // RLS já restringe o que vem de volta (vendedor só vê as próprias
  // produções — ver supabase/migrations/0001_core.sql), sem precisar
  // filtrar de novo aqui.
  const producoesQuery = supabase.from("producoes").select("*, clientes(nome)");
  const clientesQuery = supabase.from("clientes").select("*", { count: "exact", head: true }).eq("status", "ativo");

  const [{ data: producoesRaw }, { count: clientesAtivos }] = await Promise.all([
    producoesQuery,
    usuario.papel === "admin" ? clientesQuery : Promise.resolve({ count: null as number | null }),
  ]);
  const producoes = (producoesRaw ?? []) as unknown as ProducaoRow[];

  const producoesAtivas = (producoes ?? []).filter((p) => p.status_manual === "ativa");
  const comissaoMensal = producoesAtivas.reduce((sum, p) => {
    const bruta = Number(p.premio_mensal ?? 0) * (Number(p.comissao_bruta_pct ?? 0) / 100);
    return sum + bruta;
  }, 0);

  const hoje = new Date();
  const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
  const vencendo = producoesAtivas.filter((p) => {
    if (!p.vigencia_fim) return false;
    const fim = new Date(p.vigencia_fim);
    return fim >= hoje && fim <= em30dias;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {usuario.nome.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">
          {usuario.papel === "admin" ? "Visão geral da Avantar" : "Visão geral da sua carteira"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Comissão bruta/mês
            </CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{fmtMoney(comissaoMensal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Produções ativas
            </CardTitle>
            <ShieldCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{producoesAtivas.length}</div>
          </CardContent>
        </Card>
        {usuario.papel === "admin" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Clientes ativos
              </CardTitle>
              <Building2 className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{clientesAtivos ?? 0}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Vencendo em 30 dias
            </CardTitle>
            <AlertTriangle className="size-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{vencendo.length}</div>
          </CardContent>
        </Card>
      </div>

      {vencendo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Apólices vencendo em breve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {vencendo.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="font-medium">{p.clientes?.nome ?? "Cliente"}</span>
                <span className="text-muted-foreground">
                  vence em {p.vigencia_fim ? new Date(p.vigencia_fim).toLocaleDateString("pt-BR") : "—"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
