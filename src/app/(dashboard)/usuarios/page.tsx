import Link from "next/link";
import { LinkButton } from "@/components/shared/link-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const supabase = await createClient();
  const { data: usuarios } = await supabase.from("usuarios").select("*").order("nome");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Usuários</h1>
        <LinkButton href="/usuarios/novo">Novo login</LinkButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(usuarios ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link href={`/usuarios/${u.id}`} className="font-medium hover:text-primary">
                    {u.nome}
                  </Link>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{u.papel === "admin" ? "Administrador" : "Vendedor"}</Badge>
                </TableCell>
                <TableCell>
                  {u.ativo ? (
                    <Badge variant="outline" className="border-success/30 bg-success/15 text-success">Ativo</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
