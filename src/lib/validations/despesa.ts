import { z } from "zod";

export const despesaSchema = z.object({
  tipo: z.enum(["fixa", "variavel", "parcelada"]),
  descricao: z.string().min(1, "Informe a descrição."),
  valor: z.coerce.number().min(0.01, "Informe um valor."),
  categoria: z.string().optional().default(""),
  dia_vencimento: z.coerce.number().optional().default(0),
  data: z.string().optional().default(""),
  parcelas_total: z.coerce.number().optional().default(0),
  parcela_inicio: z.string().optional().default(""),
});

export const settingsSchema = z.object({
  aliquota_simples: z.coerce.number().min(0).max(100),
});
