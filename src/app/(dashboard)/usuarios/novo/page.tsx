import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsuarioForm } from "@/components/usuarios/usuario-form";
import { createUsuario } from "../actions";

export default function NovoUsuarioPage() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Novo login</CardTitle>
      </CardHeader>
      <CardContent>
        <UsuarioForm action={createUsuario} />
      </CardContent>
    </Card>
  );
}
