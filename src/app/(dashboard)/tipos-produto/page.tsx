import Link from "next/link";
import { Lock } from "lucide-react";
import { LinkButton } from "@/components/shared/link-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export default async function TiposProdutoPage() {
  const supabase = await createClient();
  const { data: tipos } = await supabase.from("tipos_produto").select("*").order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tipos de Produto</h1>
        <LinkButton href="/tipos-produto/novo">Novo tipo</LinkButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tipos ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Link href={`/tipos-produto/${t.id}`} className="flex items-center gap-2 font-medium hover:text-primary">
                    {t.nome}
                    {t.bloqueada && <Lock className="size-3 text-muted-foreground" />}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{t.descricao || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
