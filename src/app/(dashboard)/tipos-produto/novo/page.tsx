import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TipoProdutoForm } from "@/components/tipos-produto/tipo-produto-form";
import { createTipoProduto } from "../actions";

export default function NovoTipoProdutoPage() {
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Novo tipo de produto</CardTitle>
      </CardHeader>
      <CardContent>
        <TipoProdutoForm action={createTipoProduto} />
      </CardContent>
    </Card>
  );
}
