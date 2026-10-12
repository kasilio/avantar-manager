"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { excluirLote } from "@/app/(dashboard)/repasses/actions";

export function ExcluirLoteButton({ loteId }: { loteId: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setErro(null);
    if (!confirm("Excluir este repasse importado? As linhas dele também somem. Essa ação não tem volta.")) return;
    startTransition(async () => {
      try {
        await excluirLote(loteId);
        router.push("/repasses");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao excluir.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        <Trash2 className="size-4" /> Excluir repasse importado
      </Button>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
    </div>
  );
}
