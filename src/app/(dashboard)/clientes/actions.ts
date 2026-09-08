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

  const parsed = clienteSchema.safeParse({
    nome: formData.get("nome"),
    tipo_doc: formData.get("tipo_doc"),
    cnpj: formData.get("cnpj"),
    cpf: formData.get("cpf"),
    nascimento: formData.get("nascimento"),
    fantasia: formData.get("fantasia"),
    situacao: formData.get("situacao"),
    cep: formData.get("cep"),
    logradouro: formData.get("logradouro"),
    numero: formData.get("numero"),
    bairro: formData.get("bairro"),
    cidade: formData.get("cidade"),
    cnae: formData.get("cnae"),
    porte: formData.get("porte"),
    tel: formData.get("tel"),
    email_com: formData.get("email_com"),
    status: formData.get("status") || "prospect",
    obs: formData.get("obs"),
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
