import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { LinkButton } from "@/components/shared/link-button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { fmtDate, fmtDateCurta, fmtMoney } from "@/lib/format";
import type { NfseEmissao } from "@/types/database";

export default async function NotasFiscaisPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: lotes }, { data: emissoes }] = await Promise.all([
    supabase
      .from("repasses_lotes")
      .select("id, periodo_inicio, periodo_fim, comissao_bruta_total, status, nf_arquivo_nome")
      .order("periodo_fim", { ascending: false }),
    supabase
      .from("nfse_emissoes")
      .select("id, status, numero_nfse, repasse_lote_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // Mais recente primeiro por lote — repasse_lote_id não é único (uma
  // rejeição/erro gera uma tentativa nova pro mesmo lote), então pegamos só
  // a última por lote pra mostrar na listagem.
  const emissaoPorLote = new Map<string, NfseEmissao>();
  for (const e of (emissoes ?? []) as unknown as NfseEmissao[]) {
    if (e.repasse_lote_id && !emissaoPorLote.has(e.repasse_lote_id)) {
      emissaoPorLote.set(e.repasse_lote_id, e);
    }
  }
  const avulsas = (emissoes ?? []).filter((e) => !e.repasse_lote_id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notas Fiscais</h1>
        <LinkButton href="/notas-fiscais/nova">
          <Plus className="size-4" /> Nova NF
        </LinkButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Por lote de repasse</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Repasse</TableHead>
                  <TableHead>NF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lotes ?? []).map((l) => {
                  const emissao = emissaoPorLote.get(l.id);
                  const href = emissao
                    ? `/notas-fiscais/${emissao.id}`
                    : l.nf_arquivo_nome
                      ? `/repasses/${l.id}`
                      : `/notas-fiscais/nova?loteId=${l.id}`;
                  return (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Link href={href} className="block hover:underline">
                          {fmtDateCurta(l.periodo_inicio)} à {fmtDateCurta(l.periodo_fim)}
                        </Link>
                      </TableCell>
                      <TableCell>{fmtMoney(l.comissao_bruta_total)}</TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell>
                        {emissao ? (
                          <StatusBadge status={emissao.status} />
                        ) : l.nf_arquivo_nome ? (
                          <span className="text-xs text-muted-foreground">Anexada manualmente</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Não emitida</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(lotes ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Nenhum lote de repasse importado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {avulsas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas avulsas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nº NFS-e</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avulsas.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/notas-fiscais/${e.id}`} className="block hover:underline">
                          {fmtDate(e.created_at)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.numero_nfse || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
