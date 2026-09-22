import { z } from "zod";

export const usuarioCreateSchema = z.object({
  nome: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  senha_inicial: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
  papel: z.enum(["admin", "vendedor"]),
  tipo_doc: z.enum(["cnpj", "cpf"]).default("cpf"),
  cpf: z.string().optional().default(""),
  cnpj: z.string().optional().default(""),
  susep: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  pix: z.string().optional().default(""),
  obs: z.string().optional().default(""),
});

export const usuarioUpdateSchema = usuarioCreateSchema
  .omit({ senha_inicial: true })
  .extend({ ativo: z.coerce.boolean().optional().default(true) });
