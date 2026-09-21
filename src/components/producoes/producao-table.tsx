"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
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

type SortCol = "cliente" | "produto" | "seguradora" | "faturamento" | "vigencia_fim" | "status";
type SortState = { col: SortCol; dir: "asc" | "desc" };

const SORT_VALUE: Record<SortCol, (p: ProducaoRow) => string | number> = {
  cliente: (p) => p.clientes?.nome ?? "",
  produto: (p) => p.tipos_produto?.nome ?? "",
  seguradora: (p) => p.seguradoras?.nome ?? "",
  faturamento: (p) => p.faturamentoGerado ?? 0,
  vigencia_fim: (p) => p.vigencia_fim ?? "",
  status: (p) => p.status_manual ?? "",
};

function SortButton({
  label,
  col,
  sort,
  onSort,
}: {
  label: string;
  col: SortCol;
  sort: SortState | null;
  onSort: (col: SortCol) => void;
}) {
  const ativo = sort?.col === col;
  const Icone = ativo ? (sort!.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={`inline-flex items-center gap-1 hover:text-primary ${ativo ? "text-primary" : ""}`}
    >
      {label}
      <Icone className="size-3.5" />
    </button>
  );
}

export function ProducaoTable({ producoes }: { producoes: ProducaoRow[] }) {
  const [sort, setSort] = useState<SortState | null>(null);

  const linhas = useMemo(() => {
    if (!sort) return producoes;
    const getValue = SORT_VALUE[sort.col];
    const copia = [...producoes].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copia;
  }, [producoes, sort]);

  function handleSort(col: SortCol) {
    setSort((atual) => {
      if (atual?.col === col) return { col, dir: atual.dir === "asc" ? "desc" : "asc" };
      return { col, dir: "asc" };
    });
  }

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
            <TableHead><SortButton label="Cliente" col="cliente" sort={sort} onSort={handleSort} /></TableHead>
            <TableHead className="hidden md:table-cell">
              <SortButton label="Produto" col="produto" sort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead className="hidden md:table-cell">
              <SortButton label="Seguradora" col="seguradora" sort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead><SortButton label="Faturamento gerado" col="faturamento" sort={sort} onSort={handleSort} /></TableHead>
            <TableHead className="hidden md:table-cell">
              <SortButton label="Fim da vigência" col="vigencia_fim" sort={sort} onSort={handleSort} />
            </TableHead>
            <TableHead><SortButton label="Status" col="status" sort={sort} onSort={handleSort} /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((p) => (
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
