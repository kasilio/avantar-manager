import { z } from "zod";

export const tipoProdutoSchema = z.object({
  nome: z.string().min(1, "Informe o nome do tipo de produto."),
  descricao: z.string().optional().default(""),
});
