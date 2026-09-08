"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Seguradora } from "@/types/database";

export function SeguradoraTable({ seguradoras }: { seguradoras: Seguradora[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden md:table-cell">SUSEP</TableHead>
            <TableHead className="hidden md:table-cell">Telefone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seguradoras.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <Link href={`/seguradoras/${s.id}`} className="flex items-center gap-2 font-medium hover:text-primary">
                  {s.nome}
                  {s.bloqueada && <Lock className="size-3 text-muted-foreground" />}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{s.susep || "—"}</TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">{s.telefone || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
