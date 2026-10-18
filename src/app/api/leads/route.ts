import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { maskCNPJ } from "@/lib/masks";

/** Normaliza um celular brasileiro pra E.164 (+55DDD9NNNNNNNN), mesmo
 * formato de src/lib/whatsapp/phone.ts — duplicado aqui (em vez de
 * importado) pra esta rota não depender da integração de WhatsApp, que
 * ainda não foi commitada. */
function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  return null;
}

/**
 * Recebe o lead do formulário da landing page (public/cargas-frota.html) e
 * lança direto no CRM: cliente (prospect) + contato + prospecção na coluna
 * "novo" — mesma ideia de criarClienteProspectDoZero em
 * src/lib/whatsapp/conversas.ts, só que disparado pelo form em vez do
 * WhatsApp. Rota pública, sem sessão de usuário (ver PUBLIC_PATHS em
 * src/lib/supabase/middleware.ts).
 *
 * O gatilho pro lead cair no CRM é só CNPJ + celular completos — tipo de
 * seguro e responsável são opcionais e podem chegar vazios numa primeira
 * chamada (disparada ainda durante a digitação) e preenchidos depois numa
 * segunda (clienteId/contatoId/prospeccaoId de volta da primeira resposta
 * dizem pra essa segunda chamada atualizar em vez de duplicar).
 */
const leadSchema = z.object({
  tipoSeguro: z.string().optional().default(""),
  cnpj: z.string().min(1),
  razaoSocial: z.string().optional().default(""),
  responsavel: z.string().optional().default(""),
  celular: z.string().min(1),
  clienteId: z.string().optional().nullable(),
  contatoId: z.string().optional().nullable(),
  prospeccaoId: z.string().optional().nullable(),
});

// Nomes batem com o seed de tipos_produto (supabase/migrations/0001_core.sql)
// — "carga e frota" fica sem tipo definido (ambíguo) e só vai pra obs.
const TIPO_PRODUTO_POR_SEGURO: Record<string, string> = {
  "Seguro de carga": "TRANSPORTE-TR",
  "Seguro de frota": "FROTA",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const {
    tipoSeguro,
    cnpj,
    razaoSocial,
    responsavel,
    celular,
    clienteId: clienteIdRecebido,
    contatoId: contatoIdRecebido,
    prospeccaoId: prospeccaoIdRecebido,
  } = parsed.data;

  const cnpjDigits = cnpj.replace(/\D/g, "");
  const celularDigits = celular.replace(/\D/g, "");
  if (cnpjDigits.length !== 14 || (celularDigits.length !== 10 && celularDigits.length !== 11)) {
    return NextResponse.json({ error: "CNPJ e celular precisam estar completos." }, { status: 400 });
  }

  // Mesmo formato ("00.000.000/0001-00") usado pelo resto do app — ver
  // src/lib/masks.ts e src/components/clientes/cliente-form.tsx — pra um
  // cliente cadastrado manualmente depois bater com o lead da landing page.
  const cnpjFormatado = maskCNPJ(cnpj);
  const supabase = createAdminClient();

  let clienteId = clienteIdRecebido ?? null;
  let empresaNome = "";

  if (clienteId) {
    const { data } = await supabase.from("clientes").select("id, nome").eq("id", clienteId).maybeSingle();
    if (data) empresaNome = data.nome;
    else clienteId = null; // id veio de uma sessão antiga/inválida — recai pro fluxo de criação
  }

  if (!clienteId) {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id, nome")
      .eq("cnpj", cnpjFormatado)
      .limit(1)
      .maybeSingle();

    if (existente) {
      clienteId = existente.id;
      empresaNome = existente.nome;
    } else {
      const nome = razaoSocial.trim() || `CNPJ ${cnpjFormatado}`;
      const { data: criado, error } = await supabase
        .from("clientes")
        .insert({
          nome,
          tipo_doc: "cnpj",
          fantasia: null,
          cnpj: cnpjFormatado,
          cpf: null,
          nascimento: null,
          situacao: null,
          cep: null,
          logradouro: null,
          numero: null,
          bairro: null,
          cidade: null,
          cnae: null,
          porte: null,
          tel: null,
          email_com: null,
          status: "prospect",
          obs: null,
        })
        .select("id, nome")
        .single();
      if (error || !criado) {
        return NextResponse.json({ error: "Não foi possível salvar o lead." }, { status: 500 });
      }
      clienteId = criado.id;
      empresaNome = criado.nome;
    }
  } else if (razaoSocial.trim() && razaoSocial.trim() !== empresaNome) {
    // BrasilAPI às vezes responde só depois da primeira chamada (que já
    // criou o cliente com um nome provisório) — atualiza quando chegar.
    await supabase.from("clientes").update({ nome: razaoSocial.trim() }).eq("id", clienteId);
    empresaNome = razaoSocial.trim();
  }

  const whatsappE164 = normalizePhoneE164(celular);
  const nomeContato = responsavel.trim() || "Responsável (a confirmar)";
  let contatoId = contatoIdRecebido ?? null;

  if (contatoId) {
    await supabase
      .from("clientes_contatos")
      .update({ nome: nomeContato, whatsapp: celular, whatsapp_e164: whatsappE164 })
      .eq("id", contatoId);
  } else {
    const { data: contato } = await supabase
      .from("clientes_contatos")
      .insert({
        cliente_id: clienteId,
        nome: nomeContato,
        cargo: null,
        whatsapp: celular,
        whatsapp_e164: whatsappE164,
        email: null,
        aniversario: null,
      })
      .select("id")
      .single();
    contatoId = contato?.id ?? null;
  }

  const tipoProdutoNome = TIPO_PRODUTO_POR_SEGURO[tipoSeguro];
  let tipoProdutoId: string | null = null;
  if (tipoProdutoNome) {
    const { data: tipoProduto } = await supabase
      .from("tipos_produto")
      .select("id")
      .eq("nome", tipoProdutoNome)
      .maybeSingle();
    tipoProdutoId = tipoProduto?.id ?? null;
  }

  const obs = [
    "Lead recebido via landing page (Cargas & Frota).",
    `Tipo de seguro: ${tipoSeguro || "(ainda não escolhido)"}`,
    `Responsável: ${responsavel.trim() || "(ainda não informado)"}`,
    `Contato: ${celular}`,
  ].join("\n");

  let prospeccaoId = prospeccaoIdRecebido ?? null;

  if (prospeccaoId) {
    const { data } = await supabase.from("prospeccoes").select("id").eq("id", prospeccaoId).maybeSingle();
    if (!data) prospeccaoId = null;
  }

  if (prospeccaoId) {
    const { error } = await supabase
      .from("prospeccoes")
      .update({ empresa: empresaNome, tipo_produto_id: tipoProdutoId, obs })
      .eq("id", prospeccaoId);
    if (error) {
      return NextResponse.json({ error: "Não foi possível atualizar a prospecção." }, { status: 500 });
    }
  } else {
    const { data: prospeccao, error } = await supabase
      .from("prospeccoes")
      .insert({
        empresa: empresaNome,
        cliente_id: clienteId,
        tipo_produto_id: tipoProdutoId,
        coluna_id: "novo",
        next_contact: null,
        obs,
        vendedor_id: null,
      })
      .select("id")
      .single();
    if (error || !prospeccao) {
      return NextResponse.json({ error: "Não foi possível criar a prospecção." }, { status: 500 });
    }
    prospeccaoId = prospeccao.id;
  }

  return NextResponse.json({ ok: true, clienteId, contatoId, prospeccaoId });
}
