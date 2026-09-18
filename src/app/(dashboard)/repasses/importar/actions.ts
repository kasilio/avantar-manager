"use server";

import { revalidatePath } from "next/cache";
import {
  previewImportacao as previewImportacaoLib,
  commitImportacao as commitImportacaoLib,
  type PreviewResultado,
  type CommitLinhaInput,
  type CommitRelatorioInput,
  type CommitResultado,
} from "@/lib/import/repasse-import";

export async function previewImportacao(formData: FormData): Promise<PreviewResultado> {
  const arquivos = formData.getAll("arquivos").filter((f): f is File => f instanceof File && f.size > 0);
  if (arquivos.length === 0) {
    throw new Error("Selecione pelo menos um PDF.");
  }
  const dados = await Promise.all(
    arquivos.map(async (f) => ({ nome: f.name, data: new Uint8Array(await f.arrayBuffer()) }))
  );
  return previewImportacaoLib(dados);
}

export async function confirmarImportacao(
  relatorios: CommitRelatorioInput[],
  linhas: CommitLinhaInput[]
): Promise<CommitResultado> {
  const resultado = await commitImportacaoLib(relatorios, linhas);
  revalidatePath("/repasses");
  revalidatePath("/producoes");
  revalidatePath("/clientes");
  return resultado;
}
