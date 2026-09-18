import { z } from "zod";

export const seguradoraContatoSchema = z.object({
  // Sem min(1) de propósito — a action descarta contatos sem nome (mesmo
  // padrão de contatoSchema em validations/cliente.ts).
  tipo: z.enum(["ponto_focal", "financeiro", "averbacao"]).optional().default("ponto_focal"),
  nome: z.string().optional().default(""),
  telefone: z.string().optional().default(""),
  email: z.string().optional().default(""),
});

export const seguradoraSchema = z.object({
  nome: z.string().min(1, "Informe o nome da seguradora."),
  contatos: z.array(seguradoraContatoSchema).optional().default([]),
});
