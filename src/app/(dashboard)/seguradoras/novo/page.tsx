import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeguradoraForm } from "@/components/seguradoras/seguradora-form";
import { createSeguradora } from "../actions";

export default function NovaSeguradoraPage() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Nova seguradora</CardTitle>
      </CardHeader>
      <CardContent>
        <SeguradoraForm action={createSeguradora} />
      </CardContent>
    </Card>
  );
}
