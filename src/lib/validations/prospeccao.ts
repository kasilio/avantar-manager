import { z } from "zod";

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && v !== "__none__" ? v : null));

export const prospeccaoSchema = z.object({
  empresa: z.string().min(1, "Informe o nome da empresa."),
  cliente_id: optionalId,
  tipo_produto_id: optionalId,
  coluna_id: z.string().min(1),
  next_contact: z.string().optional().default(""),
  obs: z.string().optional().default(""),
  vendedor_id: optionalId,
});
