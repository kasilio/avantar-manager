import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NFSE_AMBIENTE: z.enum(["restrita", "producao"]).default("restrita"),
  NFSE_CERTIFICADO_PFX_BASE64: z.string().min(1, "NFSE_CERTIFICADO_PFX_BASE64"),
  NFSE_CERTIFICADO_SENHA: z.string().min(1, "NFSE_CERTIFICADO_SENHA"),
  // Segunda trava explícita pra emissão real — NFSE_AMBIENTE=producao sozinho
  // não basta, evita que um ambiente mal configurado transmita de verdade
  // por acidente. Só setar depois de validar um ciclo completo em restrita.
  NFSE_PERMITIR_PRODUCAO: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

type NfseEnv = z.infer<typeof envSchema>;

let cached: NfseEnv | null = null;

/**
 * Lê e valida as credenciais da emissão de NFS-e. Mesmo padrão de
 * src/lib/whatsapp/env.ts: falha rápido e explícito na primeira chamada em
 * vez de seguir com string vazia — aqui um valor vazio significaria assinar
 * (ou tentar assinar) com um certificado inválido.
 */
export function nfseEnv(): NfseEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const faltando = [...new Set(parsed.error.issues.map((issue) => issue.message))].join(", ");
    throw new Error(`Configuração da NFS-e incompleta: ${faltando}. Veja .env.example.`);
  }

  cached = parsed.data;
  return cached;
}
