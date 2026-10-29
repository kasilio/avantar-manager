"use server";

import { revalidatePath } from "next/cache";
import {
  previewImportacao as previewImportacaoLib,
  commitImportacao as commitImportacaoLib,
  type PreviewResultado,
  type CommitLinhaInput,
  type CommitLancamentoInput,
  type CommitRelatorioInput,
  type CommitResultado,
} from "@/lib/import/repasse-import";

export type AcaoResultado<T> = { ok: true; data: T } | { ok: false; message: string };

export async function previewImportacao(formData: FormData): Promise<AcaoResultado<PreviewResultado>> {
  try {
    const arquivos = formData.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
    if (arquivos.length === 0) {
      return { ok: false, message: "Selecione pelo menos um PDF." };
    }
    const dados = await Promise.all(
      arquivos.map(async (f) => ({ nome: f.name, data: new Uint8Array(await f.arrayBuffer()) }))
    );
    const data = await previewImportacaoLib(dados);
    return { ok: true, data };
  } catch (err) {
    console.error("[repasses/importar] Falha ao analisar PDFs:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Erro ao analisar os PDFs." };
  }
}

export async function confirmarImportacao(
  relatorios: CommitRelatorioInput[],
  linhas: CommitLinhaInput[],
  lancamentos: CommitLancamentoInput[] = []
): Promise<AcaoResultado<CommitResultado>> {
  try {
    const data = await commitImportacaoLib(relatorios, linhas, lancamentos);
    revalidatePath("/repasses");
    revalidatePath("/producoes");
    revalidatePath("/clientes");
    return { ok: true, data };
  } catch (err) {
    console.error("[repasses/importar] Falha ao confirmar importação:", err);
    return { ok: false, message: err instanceof Error ? err.message : "Erro ao confirmar a importação." };
  }
}
