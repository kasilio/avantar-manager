import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { deleteUsuario, updateUsuario } from "../actions";

export default async function UsuarioDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { data: usuario } = await supabase.from("usuarios").select("*").eq("id", id).single();

  if (!usuario) notFound();

  const updateWithId = updateUsuario.bind(null, id);
  const deleteWithId = deleteUsuario.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{usuario.nome}</h1>
        {admin.id !== usuario.id && (
          <form action={deleteWithId}>
            <Button type="submit" variant="destructive">
              Excluir login
            </Button>
          </form>
        )}
      </div>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Dados do usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <UsuarioForm usuario={usuario} action={updateWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
