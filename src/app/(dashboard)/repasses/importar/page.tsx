import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { ImportarRepassesForm } from "@/components/repasses/importar-repasses-form";

export default async function ImportarRepassesPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Importar repasses</h1>
        <p className="text-sm text-muted-foreground">
          Envie um ou mais PDFs do relatório &quot;PRP01 - Previsão Repasses a pagar&quot; (SGCOR/matriz da Avantar).
          Confira o que vai ser criado antes de confirmar.
        </p>
      </div>
      <ImportarRepassesForm />
    </div>
  );
}
