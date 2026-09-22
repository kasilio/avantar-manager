"use client";

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
import type { Cliente } from "@/types/database";

export type ClienteResumo = Cliente & {
  faturamento: number;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
};

function SortHeader({
  label,
  col,
  sort,
  dir,
  status,
}: {
  label: string;
  col: "nome" | "faturamento";
  sort: "nome" | "faturamento";
  dir: "asc" | "desc";
  status?: string;
}) {
  const ativo = sort === col;
  const proximaDir = ativo && dir === "asc" ? "desc" : "asc";
  const Icone = ativo ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  const statusParam = status ? `&status=${status}` : "";
  return (
    <Link
      href={`/clientes?sort=${col}&dir=${proximaDir}${statusParam}`}
      className={`inline-flex items-center gap-1 hover:text-primary ${ativo ? "text-primary" : ""}`}
    >
      {label}
      <Icone className="size-3.5" />
    </Link>
  );
}

export function ClienteTable({
  clientes,
  sort,
  dir,
  status,
}: {
  clientes: ClienteResumo[];
  sort: "nome" | "faturamento";
  dir: "asc" | "desc";
  status?: string;
}) {
  if (clientes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {status ? "Nenhum cliente encontrado pra esse filtro." : "Nenhum cliente cadastrado ainda."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SortHeader label="Nome" col="nome" sort={sort} dir={dir} status={status} /></TableHead>
            <TableHead className="hidden md:table-cell">CPF/CNPJ</TableHead>
            <TableHead className="hidden md:table-cell">Cidade/UF</TableHead>
            <TableHead><SortHeader label="Faturamento" col="faturamento" sort={sort} dir={dir} status={status} /></TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Vigência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((c) => (
            <TableRow key={c.id} className="cursor-pointer">
              <TableCell>
                <Link href={`/clientes/${c.id}`} className="font-medium hover:text-primary">
                  {c.nome}
                </Link>
                {c.fantasia && <div className="text-xs text-muted-foreground">{c.fantasia}</div>}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {c.tipo_doc === "cnpj" ? c.cnpj : c.cpf}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{c.cidade || "—"}</TableCell>
              <TableCell className="font-medium">{fmtMoney(c.faturamento)}</TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {c.vigenciaInicio || c.vigenciaFim
                  ? `${fmtDateCurta(c.vigenciaInicio)} a ${fmtDateCurta(c.vigenciaFim)}`
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
