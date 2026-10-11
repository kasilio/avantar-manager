import { z } from "zod";

export const nfseRascunhoSchema = z.object({
  valor: z.coerce.number().min(0.01, "Informe um valor."),
  competencia: z.string().min(1, "Informe a competência."),
});
