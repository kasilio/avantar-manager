import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { fmtDate, fmtDateCurta, fmtMoney, fmtPct, today } from "@/lib/format";
import type { ComissaoAcerto } from "@/types/database";
import { enviarAcerto, confirmarAcerto, marcarAcertoPago } from "../actions";

type AcertoDetalhe = ComissaoAcerto & {
  usuarios: { nome: string } | null;
  repasses_lotes: { periodo_inicio: string; periodo_fim: string } | null;
};

type ItemLinha = {
  id: string;
  comissao_bruta: number;
  comissao_pct: number;
  valor_comissao: number;
  repasses: {
    parcela: string | null;
    periodo: string;
    producoes: {
      num_apolice: string | null;
      clientes: { nome: string } | null;
      tipos_produto: { nome: string } | null;
    } | null;
  } | null;
};

export default async function AcertoComissaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requireCurrentUsuario();
  const isAdmin = usuario.papel === "admin";
  const supabase = await createClient();

  const [{ data: acertoRaw }, { data: itensRaw }] = await Promise.all([
    supabase
      .from("comissoes_acertos")
      .select("*, usuarios(nome), repasses_lotes(periodo_inicio, periodo_fim)")
      .eq("id", id)
      .single(),
    supabase
      .from("comissoes_acertos_itens")
      .select("id, comissao_bruta, comissao_pct, valor_comissao, repasses(parcela, periodo, producoes(num_apolice, clientes(nome), tipos_produto(nome)))")
      .eq("acerto_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const acerto = acertoRaw as unknown as AcertoDetalhe | null;
  if (!acerto) notFound();

  const itens = (itensRaw ?? []) as unknown as ItemLinha[];
  const souDono = acerto.vendedor_id === usuario.id;

  const enviarAcertoWithId = enviarAcerto.bind(null, id);
  const confirmarAcertoWithId = confirmarAcerto.bind(null, id);
  const marcarPagoWithId = marcarAcertoPago.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAdmin ? acerto.usuarios?.nome ?? "—" : "Seu acerto de comissão"}
          </h1>
          {acerto.repasses_lotes && (
            <p className="text-sm text-muted-foreground">
              Referente ao repasse {fmtDateCurta(acerto.repasses_lotes.periodo_inicio)} à {fmtDateCurta(acerto.repasses_lotes.periodo_fim)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-success">{fmtMoney(acerto.valor_total)}</span>
          <StatusBadge status={acerto.status} />
        </div>
      </div>

      {isAdmin && acerto.status === "rascunho" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Enviar para o vendedor confirmar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Revise o extrato abaixo. Depois de enviado, {acerto.usuarios?.nome ?? "o vendedor"} vê esse mesmo detalhamento no próprio usuário e confirma os totais.
            </p>
            <form action={enviarAcertoWithId}>
              <Button type="submit" size="sm">Enviar para confirmação</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!isAdmin && souDono && acerto.status === "enviado" && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base">Confirme os valores a receber</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Confira o extrato abaixo. Ao confirmar, o pagamento desse valor segue com o administrador.
            </p>
            <form action={confirmarAcertoWithId}>
              <Button type="submit" size="sm">Confirmar valores</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && acerto.status === "confirmado" && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="text-base">Marcar como pago</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              {acerto.usuarios?.nome ?? "O vendedor"} já confirmou {fmtMoney(acerto.valor_total)}
              {acerto.confirmado_em && <> em {fmtDate(acerto.confirmado_em)}</>}. Registre aqui depois de efetuar o pagamento.
            </p>
            <form action={marcarPagoWithId} className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="data_pagamento">Data do pagamento</Label>
                <Input id="data_pagamento" name="data_pagamento" type="date" defaultValue={today()} required className="w-44" />
              </div>
              <Button type="submit" size="sm">Confirmar pagamento</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {acerto.status === "pago" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm">
            <span>Pago em: <span className="font-medium">{fmtDate(acerto.data_pagamento)}</span></span>
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
              <TableHead>Sua comissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                  Nenhum item neste acerto.
                </TableCell>
              </TableRow>
            )}
            {itens.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <span className="font-medium">{item.repasses?.producoes?.clientes?.nome ?? "—"}</span>
                  <div className="text-xs text-muted-foreground">Apólice {item.repasses?.producoes?.num_apolice || "—"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {item.repasses?.producoes?.tipos_produto?.nome ?? "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{item.repasses?.periodo ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{item.repasses?.parcela || "—"}</TableCell>
                <TableCell>{fmtMoney(item.comissao_bruta)}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{fmtPct(item.comissao_pct)}</TableCell>
                <TableCell className="font-medium text-success">{fmtMoney(item.valor_comissao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
