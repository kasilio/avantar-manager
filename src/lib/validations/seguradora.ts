import { z } from "zod";

export const seguradoraSchema = z.object({
  nome: z.string().min(1, "Informe o nome da seguradora."),
  susep: z.string().optional().default(""),
  cnpj: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  site: z.string().optional().default(""),
  obs: z.string().optional().default(""),
});
