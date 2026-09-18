"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { clienteSchema } from "@/lib/validations/cliente";

function parseClienteFormData(formData: FormData) {
  let contatos: unknown = [];
  try {
    contatos = JSON.parse(String(formData.get("contatos_json") ?? "[]"));
  } catch {
    contatos = [];
  }

  // Os campos abaixo são opcionais no schema (`.optional()`, que só aceita
  // `undefined`, não `null`) — mas boa parte só existe no DOM condicionalmente
  // (ex. `cpf`/`nascimento` só renderizam no modo pessoa física), então
  // `formData.get()` retorna `null` pra eles sem estarem "errados". Normaliza
  // `null` -> `undefined` aqui em vez de deixar passar pro zod.
  const str = (key: string) => formData.get(key) ?? undefined;

  const parsed = clienteSchema.safeParse({
    nome: formData.get("nome"),
    tipo_doc: formData.get("tipo_doc"),
    cnpj: str("cnpj"),
    cpf: str("cpf"),
    nascimento: str("nascimento"),
    fantasia: str("fantasia"),
    situacao: str("situacao"),
    cep: str("cep"),
    logradouro: str("logradouro"),
    numero: str("numero"),
    bairro: str("bairro"),
    cidade: str("cidade"),
    cnae: str("cnae"),
    porte: str("porte"),
    tel: str("tel"),
    email_com: str("email_com"),
    status: formData.get("status") || "prospect",
    obs: str("obs"),
    contatos,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { contatos: contatosData, ...cliente } = parsed.data;
  return {
    cliente: {
      ...cliente,
      cnpj: cliente.tipo_doc === "cnpj" ? cliente.cnpj || null : null,
      cpf: cliente.tipo_doc === "cpf" ? cliente.cpf || null : null,
      nascimento: cliente.tipo_doc === "cpf" ? cliente.nascimento || null : null,
    },
    contatos: contatosData.filter((c) => c.nome),
  };
}

export async function createCliente(formData: FormData) {
  await requireCurrentUsuario();
  const { cliente, contatos } = parseClienteFormData(formData);
  const supabase = await createClient();

  const { data: created, error } = await supabase
    .from("clientes")
    .insert(cliente)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (contatos.length > 0) {
    const { error: contatosError } = await supabase
      .from("clientes_contatos")
      .insert(contatos.map((c) => ({ ...c, cliente_id: created.id })));
    if (contatosError) throw new Error(contatosError.message);
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${created.id}`);
}

export async function updateCliente(id: string, formData: FormData) {
  await requireCurrentUsuario();
  const { cliente, contatos } = parseClienteFormData(formData);
  const supabase = await createClient();

  const { error } = await supabase.from("clientes").update(cliente).eq("id", id);
  if (error) throw new Error(error.message);

  // Substitui os contatos por completo — mais simples que fazer diff, e o
  // volume por cliente é pequeno (a UI já reconstrói a lista inteira a cada save).
  const { error: delError } = await supabase.from("clientes_contatos").delete().eq("cliente_id", id);
  if (delError) throw new Error(delError.message);
  if (contatos.length > 0) {
    const { error: insError } = await supabase
      .from("clientes_contatos")
      .insert(contatos.map((c) => ({ ...c, cliente_id: id })));
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function deleteCliente(id: string) {
  await requireCurrentUsuario();
  const supabase = await createClient();

  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/clientes");
  redirect("/clientes");
}
