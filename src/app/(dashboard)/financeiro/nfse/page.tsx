import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkButton } from "@/components/shared/link-button";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { StatusNfseEmissao } from "@/types/database";

const STATUS_LABEL: Record<StatusNfseEmissao, string> = {
  rascunho: "Rascunho",
  assinado: "Assinado",
  enviando: "Enviando",
  autorizado: "Autorizado",
  rejeitado: "Rejeitado",
  erro: "Erro",
};

const STATUS_VARIANT: Record<StatusNfseEmissao, "secondary" | "outline" | "default" | "destructive"> = {
  rascunho: "outline",
  assinado: "secondary",
  enviando: "secondary",
  autorizado: "default",
  rejeitado: "destructive",
  erro: "destructive",
};

export default async function NfseListaPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: emissoes } = await supabase
    .from("nfse_emissoes")
    .select("id, competencia, valor, status, numero_nfse, ambiente, created_at")
    .order("competencia", { ascending: false })
    .order("numero_dps", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Notas fiscais</h1>
        <LinkButton href="/financeiro/nfse/nova">
          <Plus className="size-4" /> Nova NF
        </LinkButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Emissões</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nº NFS-e</TableHead>
                  <TableHead>Ambiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(emissoes ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <a href={`/financeiro/nfse/${e.id}`} className="block hover:underline">
                        {fmtDate(e.competencia)}
                      </a>
                    </TableCell>
                    <TableCell>{fmtMoney(e.valor)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.numero_nfse || "—"}</TableCell>
                    <TableCell>
                      {e.ambiente === "producao" ? (
                        <span className="text-foreground">Produção</span>
                      ) : (
                        <span className="text-muted-foreground">Restrita (teste)</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(emissoes ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      Nenhuma NF emitida por aqui ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
