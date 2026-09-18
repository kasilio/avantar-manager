import { z } from "zod";

export const repasseSchema = z.object({
  lote_id: z.string().min(1, "Selecione o lote."),
  producao_id: z.string().min(1, "Selecione a produção."),
  parcela: z.string().optional().default(""),
  periodo: z.string().min(1, "Informe o período (AAAA-MM)."),
  comissao_bruta: z.coerce.number().optional().default(0),
  apolice_pct: z.coerce.number().optional().default(0),
  repasse_pct: z.coerce.number().optional().default(0),
});
