import { z } from "zod";

export const tarefaSchema = z.object({
  titulo: z.string().min(1, "Informe o título da tarefa."),
  data: z.string().min(1, "Informe a data."),
  descricao: z.string().optional().default(""),
});
