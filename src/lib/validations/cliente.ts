import { z } from "zod";

export const contatoSchema = z.object({
  nome: z.string().min(1),
  cargo: z.string().optional().default(""),
  whatsapp: z.string().optional().default(""),
  email: z.string().optional().default(""),
  aniversario: z.string().optional().default(""),
});

export const clienteSchema = z.object({
  nome: z.string().min(1, "Informe o nome do cliente."),
  tipo_doc: z.enum(["cnpj", "cpf"]),
  cnpj: z.string().optional().default(""),
  cpf: z.string().optional().default(""),
  nascimento: z.string().optional().default(""),
  fantasia: z.string().optional().default(""),
  situacao: z.string().optional().default(""),
  cep: z.string().optional().default(""),
  logradouro: z.string().optional().default(""),
  numero: z.string().optional().default(""),
  bairro: z.string().optional().default(""),
  cidade: z.string().optional().default(""),
  cnae: z.string().optional().default(""),
  porte: z.string().optional().default(""),
  tel: z.string().optional().default(""),
  email_com: z.string().optional().default(""),
  status: z.enum(["prospect", "ativo", "inativo"]).optional().default("prospect"),
  obs: z.string().optional().default(""),
  contatos: z.array(contatoSchema).optional().default([]),
});

export type ClienteFormValues = z.infer<typeof clienteSchema>;
