import { z } from "zod";

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && v !== "__none__" ? v : null));

export const producaoSchema = z.object({
  cliente_id: z.string().min(1, "Selecione um cliente."),
  tipo_produto_id: optionalId,
  seguradora_id: optionalId,
  num_apolice: z.string().optional().default(""),
  num_proposta: z.string().optional().default(""),
  premio_mensal: z.coerce.number().optional().default(0),
  premio_total: z.coerce.number().optional().default(0),
  comissao_bruta_pct: z.coerce.number().optional().default(0),
  parcelas: z.string().optional().default(""),
  vigencia_inicio: z.string().optional().default(""),
  vigencia_fim: z.string().optional().default(""),
  data_renovacao: z.string().optional().default(""),
  status_manual: z.enum(["ativa", "vencida", "cancelada"]).optional().default("ativa"),
  vendedor_id: optionalId,
  comissao_pct: z.coerce.number().optional().default(0),
  obs: z.string().optional().default(""),
});

export type ProducaoFormValues = z.infer<typeof producaoSchema>;
