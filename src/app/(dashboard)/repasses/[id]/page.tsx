import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyInput } from "@/components/shared/money-input";
import { LoteStepper } from "@/components/repasses/lote-stepper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtDateCurta, fmtMoney, today } from "@/lib/format";
import type { RepasseLote } from "@/types/database";
import { anexarNf, registrarPagamento } from "../actions";

export default async function RepasseLoteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: loteRaw }, { data: linhasRaw }] = await Promise.all([
    supabase.from("repasses_lotes").select("*").eq("id", id).single(),
    supabase
      .from("repasses")
      .select("*, producoes(num_apolice, clientes(nome), tipos_produto(nome))")
      .eq("lote_id", id)
      .order("periodo", { ascending: true }),
  ]);
  const lote = loteRaw as RepasseLote | null;
  if (!lote) notFound();

  const linhas = (linhasRaw ?? []) as unknown as Array<{
    id: string;
    parcela: string | null;
    periodo: string;
    comissao_bruta: number | null;
    producoes: { num_apolice: string | null; clientes: { nome: string } | null; tipos_produto: { nome: string } | null } | null;
  }>;

  const anexarNfWithId = anexarNf.bind(null, id);
  const registrarPagamentoWithId = registrarPagamento.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Repasse {fmtDateCurta(lote.periodo_inicio)} à {fmtDateCurta(lote.periodo_fim)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{fmtMoney(lote.comissao_bruta_total)}</span>
          <StatusBadge status={lote.status} />
        </div>
      </div>

      <LoteStepper status={lote.status} criadoEm={lote.created_at} />

      {lote.status !== "pago" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lote.status === "aguardando_nf" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🧾 Anexar NF</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={anexarNfWithId} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="nf_arquivo">PDF da NF (DANFSe)</Label>
                    <Input id="nf_arquivo" name="nf_arquivo" type="file" accept="application/pdf" required />
                    <p className="text-xs text-muted-foreground">
                      O sistema lê o número e o valor da nota e confere se bate com o total deste repasse ({fmtMoney(lote.comissao_bruta_total)}).
                    </p>
                  </div>
                  <Button type="submit" size="sm" className="self-start">
                    Analisar e anexar
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
          {lote.status === "aguardando_pagamento" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">💰 Marcar como pago</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={registrarPagamentoWithId} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">NF {lote.nf_info}</span>
                    <a href={`/repasses/${id}/nf`} className="text-primary hover:underline">
                      Baixar NF
                    </a>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="data_pagamento">Data</Label>
                      <Input id="data_pagamento" name="data_pagamento" type="date" defaultValue={today()} required />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="valor_pago">Valor pago</Label>
                      <MoneyInput id="valor_pago" name="valor_pago" defaultValue={lote.comissao_bruta_total} />
                    </div>
                  </div>
                  <Button type="submit" size="sm" className="self-start">
                    Confirmar pagamento
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {lote.status === "pago" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
            <span>NF: <span className="font-medium">{lote.nf_info || "—"}</span></span>
            <span>Pago em: <span className="font-medium">{fmtDate(lote.data_pagamento)}</span></span>
            <span>Valor pago: <span className="font-medium">{fmtMoney(lote.valor_pago)}</span></span>
            {lote.nf_arquivo_nome && (
              <a href={`/repasses/${id}/nf`} className="text-primary hover:underline">
                Baixar NF
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold">Extrato</h2>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Ramo</TableHead>
              <TableHead className="hidden md:table-cell">Período</TableHead>
              <TableHead className="hidden md:table-cell">Parcela</TableHead>
              <TableHead>Comissão bruta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Nenhuma linha neste lote.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l) => (
              <TableRow key={l.id}>
                <TableCell>
                  <Link href={`/repasses/${id}/linhas/${l.id}`} className="font-medium hover:text-primary">
                    {l.producoes?.clientes?.nome ?? "—"}
                  </Link>
                  <div className="text-xs text-muted-foreground">Apólice {l.producoes?.num_apolice || "—"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {l.producoes?.tipos_produto?.nome ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.periodo}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{l.parcela || "—"}</TableCell>
                <TableCell>{fmtMoney(l.comissao_bruta)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
