"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { fmtDateCurta, fmtMoney } from "@/lib/format";
import type { Cliente, Producao, Seguradora, TipoProduto } from "@/types/database";

export type ProducaoRow = Producao & {
  clientes: Pick<Cliente, "nome"> | null;
  tipos_produto: Pick<TipoProduto, "nome"> | null;
  seguradoras: Pick<Seguradora, "nome"> | null;
  faturamentoGerado?: number;
};

export function ProducaoTable({ producoes }: { producoes: ProducaoRow[] }) {
  if (producoes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhuma produção cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Produto</TableHead>
            <TableHead className="hidden md:table-cell">Seguradora</TableHead>
            <TableHead>Faturamento gerado</TableHead>
            <TableHead className="hidden md:table-cell">Fim da vigência</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {producoes.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <Link href={`/producoes/${p.id}`} className="font-medium hover:text-primary">
                  {p.clientes?.nome ?? "—"}
                </Link>
                <div className="text-xs text-muted-foreground">Apólice {p.num_apolice || "—"}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{p.tipos_produto?.nome ?? "—"}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{p.seguradoras?.nome ?? "—"}</TableCell>
              <TableCell className="font-medium">{fmtMoney(p.faturamentoGerado)}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {p.vigencia_fim ? fmtDateCurta(p.vigencia_fim) : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status_manual} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
