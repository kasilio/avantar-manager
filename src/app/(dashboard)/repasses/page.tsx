import Link from "next/link";
import { LinkButton } from "@/components/shared/link-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { fmtMoney } from "@/lib/format";

export default async function RepassesPage() {
  const supabase = await createClient();
  const { data: repasses } = await supabase
    .from("repasses")
    .select("*, producoes(num_apolice, clientes(nome))")
    .order("periodo", { ascending: false });

  const rows = (repasses ?? []) as unknown as Array<{
    id: string;
    parcela: string | null;
    periodo: string;
    comissao_bruta: number | null;
    status: string;
    producoes: { num_apolice: string | null; clientes: { nome: string } | null } | null;
  }>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Repasses</h1>
        <LinkButton href="/repasses/novo">Novo repasse</LinkButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Período</TableHead>
              <TableHead className="hidden md:table-cell">Parcela</TableHead>
              <TableHead>Comissão bruta</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/repasses/${r.id}`} className="font-medium hover:text-primary">
                    {r.producoes?.clientes?.nome ?? "—"}
                  </Link>
                  <div className="text-xs text-muted-foreground">Apólice {r.producoes?.num_apolice || "—"}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{r.periodo}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{r.parcela || "—"}</TableCell>
                <TableCell>{fmtMoney(r.comissao_bruta)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
