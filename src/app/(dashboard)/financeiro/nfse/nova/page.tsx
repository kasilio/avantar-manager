import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/shared/money-input";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { criarRascunho } from "../actions";

export default async function NovaNfsePage() {
  await requireAdmin();
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nova NF</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da nota</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={criarRascunho} className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Os outros dados (prestador, tomador, serviço) já estão fixos no sistema — só valor e
              competência mudam de nota pra nota. O próximo passo mostra tudo pra revisão antes de
              assinar e transmitir.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="valor">Valor da nota</Label>
              <MoneyInput id="valor" name="valor" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="competencia">Competência</Label>
              <Input id="competencia" name="competencia" type="date" defaultValue={hoje} required />
            </div>
            <Button type="submit">Criar rascunho</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
