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
import type { Seguradora, SeguradoraContato, TipoContatoSeguradora } from "@/types/database";

const TIPO_LABEL: Record<TipoContatoSeguradora, string> = {
  ponto_focal: "Ponto focal",
  financeiro: "Financeiro",
  averbacao: "Averbação",
};

/** Contato de destaque pra listagem: prioriza o ponto focal, senão o
 * primeiro contato cadastrado — mostra só um, por pedido do usuário. */
function contatoPrioritario(contatos: SeguradoraContato[]): SeguradoraContato | null {
  return contatos.find((c) => c.tipo === "ponto_focal") ?? contatos[0] ?? null;
}

export function SeguradoraTable({
  seguradoras,
  contatos,
}: {
  seguradoras: Seguradora[];
  contatos: SeguradoraContato[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="hidden md:table-cell">Tipo de contato</TableHead>
            <TableHead className="hidden md:table-cell">Telefone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seguradoras.map((s) => {
            const contato = contatoPrioritario(contatos.filter((c) => c.seguradora_id === s.id));
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <Link href={`/seguradoras/${s.id}`} className="flex items-center gap-2 font-medium hover:text-primary">
                    {s.nome}
                    {s.bloqueada && <Lock className="size-3 text-muted-foreground" />}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{contato?.nome || "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {contato ? TIPO_LABEL[contato.tipo] : "—"}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{contato?.telefone || "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
