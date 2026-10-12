import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, FileDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TransmitirNfseForm } from "@/components/notas-fiscais/transmitir-nfse-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { fmtDate, fmtDateCurta, fmtMoney } from "@/lib/format";
import { PRESTADOR, TOMADOR, SERVICO } from "@/lib/nfse/dados-fixos";
import { assinarRascunho, cancelarRascunho } from "../actions";

export default async function NfseRevisaoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  const { data: emissao } = await supabase.from("nfse_emissoes").select("*").eq("id", id).maybeSingle();
  if (!emissao) notFound();

  const { data: lote } = emissao.repasse_lote_id
    ? await supabase
        .from("repasses_lotes")
        .select("id, periodo_inicio, periodo_fim")
        .eq("id", emissao.repasse_lote_id)
        .maybeSingle()
    : { data: null };

  const ehProducao = emissao.ambiente === "producao";

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          NF — {fmtDate(emissao.competencia)} (DPS {emissao.serie_dps}/{emissao.numero_dps})
        </h1>
        <Badge variant={ehProducao ? "destructive" : "outline"}>
          {ehProducao ? "PRODUÇÃO REAL" : "PRODUÇÃO RESTRITA — sem valor fiscal"}
        </Badge>
      </div>

      {ehProducao && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          Esta emissão vai gerar um documento fiscal real. Confira tudo com atenção antes de transmitir.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da nota</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Valor" valor={fmtMoney(emissao.valor)} />
            <Campo label="Competência" valor={fmtDate(emissao.competencia)} />
            <Campo label="Série / número DPS" valor={`${emissao.serie_dps} / ${emissao.numero_dps}`} />
            <Campo label="Status" valor={emissao.status} />
          </div>

          {lote && (
            <p className="text-sm text-muted-foreground">
              Repasse vinculado:{" "}
              <Link href={`/repasses/${lote.id}`} className="text-primary hover:underline">
                {fmtDateCurta(lote.periodo_inicio)} à {fmtDateCurta(lote.periodo_fim)}
              </Link>
            </p>
          )}

          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">Prestador</h3>
              <p className="text-sm text-muted-foreground">{PRESTADOR.nome}</p>
              <p className="text-sm text-muted-foreground">CNPJ {PRESTADOR.cnpj}</p>
              <p className="text-sm text-muted-foreground">
                {PRESTADOR.logradouro}, {PRESTADOR.numero} — {PRESTADOR.bairro}
              </p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium">Tomador</h3>
              <p className="text-sm text-muted-foreground">{TOMADOR.nome}</p>
              <p className="text-sm text-muted-foreground">CNPJ {TOMADOR.cnpj}</p>
              <p className="text-sm text-muted-foreground">
                {TOMADOR.logradouro}, {TOMADOR.numero} — {TOMADOR.bairro}
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">Serviço</h3>
            <p className="text-sm text-muted-foreground">{SERVICO.descricaoServico}</p>
            <p className="text-sm text-muted-foreground">
              Código {SERVICO.codigoTributacaoNacional} · NBS {SERVICO.codigoNbs}
            </p>
          </div>
        </CardContent>
      </Card>

      {emissao.status === "rejeitado" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            <p className="font-medium">Rejeitado pelo governo:</p>
            <p>{emissao.motivo_rejeicao || "Sem detalhe."}</p>
          </CardContent>
        </Card>
      )}
      {emissao.status === "erro" && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            <p className="font-medium">Erro ao transmitir:</p>
            <p>{emissao.erro_detalhe || "Sem detalhe."}</p>
          </CardContent>
        </Card>
      )}
      {emissao.status === "autorizado" && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex flex-col gap-1 py-4 text-sm">
            <p className="font-medium text-success">NFS-e autorizada</p>
            <p className="text-muted-foreground">Número: {emissao.numero_nfse}</p>
            <p className="text-muted-foreground">Chave de acesso: {emissao.chave_acesso}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">XML</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {emissao.dps_xml_assinado && (
            <a
              href={`/notas-fiscais/${id}/xml`}
              className="flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <FileDown className="size-4" /> Baixar XML assinado
            </a>
          )}
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Ver XML {emissao.dps_xml_assinado ? "assinado" : "(sem assinar)"}
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs break-all whitespace-pre-wrap">
              {emissao.dps_xml_assinado || emissao.dps_xml}
            </pre>
          </details>
        </CardContent>
      </Card>

      {emissao.status === "rascunho" && (
        <div className="flex gap-3">
          <form action={assinarRascunho.bind(null, id)}>
            <Button type="submit">Assinar</Button>
          </form>
          <form action={cancelarRascunho.bind(null, id)}>
            <Button type="submit" variant="outline">
              Cancelar rascunho
            </Button>
          </form>
        </div>
      )}

      {emissao.status === "assinado" && <TransmitirNfseForm id={id} />}
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{valor}</p>
    </div>
  );
}
