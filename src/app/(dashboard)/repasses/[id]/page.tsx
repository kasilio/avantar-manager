import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyInput } from "@/components/shared/money-input";
import { LinkButton } from "@/components/shared/link-button";
import { LoteStepper } from "@/components/repasses/lote-stepper";
import { ExcluirLoteButton } from "@/components/repasses/excluir-lote-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtDate, fmtDateCurta, fmtMoney, fmtPct, today } from "@/lib/format";
import type { NfseEmissao, RepasseLote, RepasseLoteLancamento } from "@/types/database";
import { anexarNf, registrarPagamento } from "../actions";

export default async function RepasseLoteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const usuario = await requireCurrentUsuario();
  const isAdmin = usuario.papel === "admin";
  const supabase = await createClient();

  const [{ data: loteRaw }, { data: linhasRaw }, { data: emissoesRaw }, { data: lancamentosRaw }] = await Promise.all([
    supabase.from("repasses_lotes").select("*").eq("id", id).single(),
    supabase
      .from("repasses")
      .select("*, producoes(num_apolice, comissao_pct, clientes(nome), tipos_produto(nome))")
      .eq("lote_id", id)
      .order("periodo", { ascending: true }),
    supabase
      .from("nfse_emissoes")
      .select("id, status, numero_nfse")
      .eq("repasse_lote_id", id)
      .order("created_at", { ascending: false }),
    isAdmin
      ? supabase.from("repasses_lote_lancamentos").select("*").eq("lote_id", id).order("data", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);
  const lote = loteRaw as RepasseLote | null;
  if (!lote) notFound();

  const lancamentos = (lancamentosRaw ?? []) as RepasseLoteLancamento[];
  const somaLancamentos = lancamentos.reduce((sum, l) => sum + Number(l.valor ?? 0), 0);

  const emissoes = (emissoesRaw ?? []) as Pick<NfseEmissao, "id" | "status" | "numero_nfse">[];
  const ultimaEmissao = emissoes[0] ?? null;
  const temNfAutorizada = emissoes.some((e) => e.status === "autorizado");

  const linhas = (linhasRaw ?? []) as unknown as Array<{
    id: string;
    parcela: string | null;
    periodo: string;
    comissao_bruta: number | null;
    producoes: {
      num_apolice: string | null;
      comissao_pct: number | null;
      clientes: { nome: string } | null;
      tipos_produto: { nome: string } | null;
    } | null;
  }>;

  // Pra vendedor, RLS já filtra `linhas` só pras próprias produções — o
  // total do lote (`lote.comissao_bruta_total`) é da empresa inteira, então
  // pra ele mostramos a soma do que é dele mesmo, calculada aqui.
  const meuFaturado = linhas.reduce((sum, l) => sum + Number(l.comissao_bruta ?? 0), 0);
  const minhaComissao = linhas.reduce((sum, l) => {
    const pct = Number(l.producoes?.comissao_pct ?? 0) / 100;
    return sum + Number(l.comissao_bruta ?? 0) * pct;
  }, 0);

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
          <span className="font-medium">{fmtMoney(isAdmin ? lote.comissao_bruta_total : meuFaturado)}</span>
          <StatusBadge status={lote.status} />
          {isAdmin && <ExcluirLoteButton loteId={id} />}
        </div>
      </div>

      {ultimaEmissao && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <span>
              NF ({ultimaEmissao.numero_nfse ? `nº ${ultimaEmissao.numero_nfse}` : "emissão em andamento"}):{" "}
              <StatusBadge status={ultimaEmissao.status} />
            </span>
            <Link href={`/notas-fiscais/${ultimaEmissao.id}`} className="text-primary hover:underline">
              Ver NF
            </Link>
          </CardContent>
        </Card>
      )}

      {!isAdmin && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
            <span>Faturado (sua carteira): <span className="font-medium">{fmtMoney(meuFaturado)}</span></span>
            <span>Sua comissão: <span className="font-semibold text-success">{fmtMoney(minhaComissao)}</span></span>
          </CardContent>
        </Card>
      )}

      <LoteStepper status={lote.status} criadoEm={lote.created_at} />

      {isAdmin && lote.status !== "pago" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {lote.status === "aguardando_nf" && !temNfAutorizada && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✍️ Emitir NF</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Monta, assina e transmite a NFS-e direto pelo sistema, com o certificado da empresa.
                </p>
                <LinkButton href={`/notas-fiscais/nova?loteId=${id}`} size="sm" className="self-start">
                  Emitir NF
                </LinkButton>
              </CardContent>
            </Card>
          )}
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
            {isAdmin && <span>NF: <span className="font-medium">{lote.nf_info || "—"}</span></span>}
            <span>Pago em: <span className="font-medium">{fmtDate(lote.data_pagamento)}</span></span>
            {isAdmin && <span>Valor pago: <span className="font-medium">{fmtMoney(lote.valor_pago)}</span></span>}
            {isAdmin && lote.nf_arquivo_nome && (
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
              <TableHead className="hidden md:table-cell">%</TableHead>
              <TableHead>{isAdmin ? "Comissão vendedor" : "Sua comissão"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhuma linha neste lote.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l) => {
              const pct = l.producoes?.comissao_pct ?? null;
              const valorComissao = Number(l.comissao_bruta ?? 0) * (Number(pct ?? 0) / 100);
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    {isAdmin ? (
                      <Link href={`/repasses/${id}/linhas/${l.id}`} className="font-medium hover:text-primary">
                        {l.producoes?.clientes?.nome ?? "—"}
                      </Link>
                    ) : (
                      <span className="font-medium">{l.producoes?.clientes?.nome ?? "—"}</span>
                    )}
                    <div className="text-xs text-muted-foreground">Apólice {l.producoes?.num_apolice || "—"}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {l.producoes?.tipos_produto?.nome ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{l.periodo}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{l.parcela || "—"}</TableCell>
                  <TableCell>{fmtMoney(l.comissao_bruta)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{fmtPct(pct)}</TableCell>
                  <TableCell className="font-medium text-success">{fmtMoney(valorComissao)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {isAdmin && lancamentos.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">
            Outros lançamentos <span className="text-sm font-normal text-muted-foreground">({fmtMoney(somaLancamentos)})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Créditos/débitos avulsos do relatório, sem apólice associada — não entram na comissão bruta nem na NF.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lancamentos.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.documento}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{l.descricao}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{fmtDateCurta(l.data)}</TableCell>
                    <TableCell>{fmtMoney(l.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
