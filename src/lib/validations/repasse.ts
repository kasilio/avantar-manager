import { z } from "zod";

export const repasseSchema = z.object({
  producao_id: z.string().min(1, "Selecione a produção."),
  parcela: z.string().optional().default(""),
  periodo: z.string().min(1, "Informe o período (AAAA-MM)."),
  comissao_bruta: z.coerce.number().optional().default(0),
  apolice_pct: z.coerce.number().optional().default(0),
  repasse_pct: z.coerce.number().optional().default(0),
  status: z.enum(["aguardando_nf", "aguardando_pagamento", "pago"]).optional().default("aguardando_nf"),
  nf_info: z.string().optional().default(""),
  data_pagamento: z.string().optional().default(""),
  valor_pago: z.coerce.number().optional().default(0),
});
