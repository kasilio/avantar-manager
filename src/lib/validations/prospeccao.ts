import { z } from "zod";

const optionalId = z
  .string()
  .optional()
  .transform((v) => (v && v !== "__none__" ? v : null));

export const prospeccaoSchema = z.object({
  // "__novo__" = cadastrar um cliente novo (só com o nome) a partir de
  // `empresa_novo_nome` — ver resolverClienteEEmpresa em crm/actions.ts.
  // Empresa/cliente deixou de ser um campo de texto solto: toda prospecção
  // fica ligada a um cliente cadastrado, nem que seja só pelo nome.
  cliente_id: z.string().min(1, "Selecione ou cadastre uma empresa."),
  empresa_novo_nome: z.string().optional().default(""),
  tipo_produto_id: optionalId,
  coluna_id: z.string().min(1),
  next_contact: z.string().optional().default(""),
  obs: z.string().optional().default(""),
  vendedor_id: optionalId,
});
