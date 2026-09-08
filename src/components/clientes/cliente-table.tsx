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
import type { Cliente } from "@/types/database";

export function ClienteTable({ clientes }: { clientes: Cliente[] }) {
  if (clientes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Nenhum cliente cadastrado ainda.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">Documento</TableHead>
            <TableHead className="hidden md:table-cell">Cidade</TableHead>
            <TableHead>Status</TableHead>
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
              <TableCell className="hidden md:table-cell text-muted-foreground">{c.cidade}</TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
