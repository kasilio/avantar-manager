import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { createCliente } from "../actions";

export default function NovoClientePage() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Novo cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <ClienteForm action={createCliente} />
      </CardContent>
    </Card>
  );
}
