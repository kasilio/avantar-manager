import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-current-usuario";
import { parseRepassePdf, periodoAaaaMm, type RepasseRelatorioParsed } from "./parse-repasse-pdf";

function normalize(s: string) {
  return s
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(s: string) {
  return normalize(s).replace(/\s+/g, "");
}

/** "DD/MM/YYYY" -> "YYYY-MM-DD" (formato de data do relatório -> coluna `date`). */
function brDateToIso(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Companhia/seguradora no relatório às vezes vem abreviada ou truncada
 * (ex. "HDI" pro cadastro "HDI Seguros", "BRADESCO -" pro cadastro
 * "Bradesco Seguros") — casa por prefixo em vez de igualdade exata. */
function matchByPrefix(raw: string, candidatos: { id: string; nome: string }[]): { id: string; nome: string } | null {
  const alvo = normalize(raw);
  if (!alvo) return null;
  for (const c of candidatos) {
    const nome = normalize(c.nome);
    if (nome === alvo || nome.startsWith(alvo) || alvo.startsWith(nome)) return c;
  }
  return null;
}

/** Ramo do relatório às vezes difere só na pontuação do cadastro (ex.
 * "TRANSPORTE - TR" no PDF vs "TRANSPORTE-TR" no cadastro) — casa ignorando
 * espaços/hífen dos dois lados. */
function matchTipoProduto(raw: string, candidatos: { id: string; nome: string }[]): { id: string; nome: string } | null {
  const alvo = normalizeCompact(raw);
  if (!alvo) return null;
  return candidatos.find((c) => normalizeCompact(c.nome) === alvo) ?? null;
}

function guessTipoDoc(nome: string): "cnpj" | "cpf" {
  return /\b(LTDA|LT|EIRELI|COMERCIO|NEGOCIOS|S\/?A|SA|ME|EPP|IND(USTRIA)?)\b/.test(normalize(nome)) ? "cnpj" : "cpf";
}

interface Contexto {
  clientes: { id: string; nome: string }[];
  tiposProduto: { id: string; nome: string }[];
  seguradoras: { id: string; nome: string }[];
  producoes: { id: string; num_proposta: string | null }[];
}

async function carregarContexto(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Contexto> {
  const [{ data: clientes }, { data: tiposProduto }, { data: seguradoras }, { data: producoes }] = await Promise.all([
    supabase.from("clientes").select("id, nome"),
    supabase.from("tipos_produto").select("id, nome"),
    supabase.from("seguradoras").select("id, nome"),
    supabase.from("producoes").select("id, num_proposta"),
  ]);
  return {
    clientes: (clientes ?? []) as Contexto["clientes"],
    tiposProduto: (tiposProduto ?? []) as Contexto["tiposProduto"],
    seguradoras: (seguradoras ?? []) as Contexto["seguradoras"],
    producoes: (producoes ?? []) as Contexto["producoes"],
  };
}

export interface PreviewLinha {
  arquivo: string;
  propostaId: string;
  apoliceEndosso: string;
  seguradoNome: string;
  parcelaId: string;
  parcela: string;
  ramoNome: string;
  companhiaNome: string;
  apolicePct: number;
  repassePct: number;
  comissao: number;
  periodo: string;

  clienteExiste: boolean;
  tipoDocSugerido: "cnpj" | "cpf";

  tipoProdutoExiste: boolean;
  seguradoraExiste: boolean;
  producaoExiste: boolean;

  jaImportado: boolean;
}

export interface PreviewRelatorio {
  arquivo: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  totalConfere: boolean | null;
  comissaoBrutaTotal: number | null;
  somaLinhas: number;
  linhasIgnoradas: number;
}

export interface PreviewResultado {
  relatorios: PreviewRelatorio[];
  linhas: PreviewLinha[];
}

async function resolverLinha(
  ctx: Contexto,
  relatorio: RepasseRelatorioParsed,
  linha: RepasseRelatorioParsed["linhas"][number]
): Promise<PreviewLinha> {
  const cliente = ctx.clientes.find((c) => normalize(c.nome) === normalize(linha.segurado));
  const tipoProduto = matchTipoProduto(linha.ramo, ctx.tiposProduto);
  const seguradora = matchByPrefix(linha.companhia, ctx.seguradoras);
  const producao = ctx.producoes.find((p) => p.num_proposta === linha.propostaId);

  return {
    arquivo: relatorio.arquivo,
    propostaId: linha.propostaId,
    apoliceEndosso: linha.apoliceEndosso,
    seguradoNome: linha.segurado,
    parcelaId: linha.parcelaId,
    parcela: linha.parcela,
    ramoNome: linha.ramo,
    companhiaNome: linha.companhia,
    apolicePct: linha.apolicePct,
    repassePct: linha.repassePct,
    comissao: linha.comissao,
    periodo: periodoAaaaMm(relatorio) ?? "",
    clienteExiste: !!cliente,
    tipoDocSugerido: guessTipoDoc(linha.segurado),
    tipoProdutoExiste: !!tipoProduto,
    seguradoraExiste: !!seguradora,
    producaoExiste: !!producao,
    jaImportado: false,
  };
}

/** Marca `jaImportado` pra linhas cuja produção já existe e já tem um
 * repasse com a mesma parcela — dedupe key = (producao_id, parcela). */
async function marcarJaImportados(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: Contexto,
  linhas: PreviewLinha[]
): Promise<PreviewLinha[]> {
  const producaoIds = [...new Set(linhas.map((l) => ctx.producoes.find((p) => p.num_proposta === l.propostaId)?.id).filter((v): v is string => !!v))];
  if (producaoIds.length === 0) return linhas;

  const { data: repassesExistentes } = await supabase.from("repasses").select("producao_id, parcela").in("producao_id", producaoIds);
  const existentesSet = new Set((repassesExistentes ?? []).map((r) => `${r.producao_id}::${r.parcela}`));

  return linhas.map((l) => {
    const producaoId = ctx.producoes.find((p) => p.num_proposta === l.propostaId)?.id;
    const jaImportado = !!producaoId && existentesSet.has(`${producaoId}::${l.parcela}`);
    return { ...l, jaImportado };
  });
}

export async function previewImportacao(arquivos: { nome: string; data: Uint8Array }[]): Promise<PreviewResultado> {
  await requireAdmin();
  const supabase = await createClient();
  const ctx = await carregarContexto(supabase);

  const relatorios: PreviewRelatorio[] = [];
  let linhas: PreviewLinha[] = [];

  for (const arquivo of arquivos) {
    const relatorio = await parseRepassePdf(arquivo.data, arquivo.nome);
    relatorios.push({
      arquivo: relatorio.arquivo,
      periodoInicio: relatorio.periodoInicio,
      periodoFim: relatorio.periodoFim,
      totalConfere: relatorio.totalConfere,
      comissaoBrutaTotal: relatorio.comissaoBrutaTotal,
      somaLinhas: relatorio.somaLinhas,
      linhasIgnoradas: relatorio.linhasIgnoradas,
    });
    for (const linha of relatorio.linhas) {
      linhas.push(await resolverLinha(ctx, relatorio, linha));
    }
  }

  linhas = await marcarJaImportados(supabase, ctx, linhas);

  return { relatorios, linhas };
}

export interface CommitLinhaInput {
  arquivo: string;
  propostaId: string;
  apoliceEndosso: string;
  seguradoNome: string;
  parcelaId: string;
  parcela: string;
  ramoNome: string;
  companhiaNome: string;
  apolicePct: number;
  repassePct: number;
  comissao: number;
  periodo: string;
  tipoDocEscolhido: "cnpj" | "cpf";
}

export interface CommitRelatorioInput {
  arquivo: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  comissaoBrutaTotal: number | null;
}

export interface CommitResultado {
  clientesCriados: number;
  seguradorasCriadas: number;
  tiposProdutoCriados: number;
  producoesCriadas: number;
  repassesCriados: number;
  repassesIgnorados: number;
}

export async function commitImportacao(relatorios: CommitRelatorioInput[], linhas: CommitLinhaInput[]): Promise<CommitResultado> {
  const usuario = await requireAdmin();
  const supabase = await createClient();
  const ctx = await carregarContexto(supabase);

  const resultado: CommitResultado = {
    clientesCriados: 0,
    seguradorasCriadas: 0,
    tiposProdutoCriados: 0,
    producoesCriadas: 0,
    repassesCriados: 0,
    repassesIgnorados: 0,
  };

  const relatoriosPorArquivo = new Map(relatorios.map((r) => [r.arquivo, r]));
  const loteCache = new Map<string, string>();

  /** Um lote = um relatório/período. Dedupe por (periodo_inicio, periodo_fim),
   * não por nome de arquivo — o mesmo relatório costuma ser rebaixado com
   * sufixos diferentes ("MAGALHAES_(1) (2).pdf"), e isso não pode virar lote
   * duplicado. */
  async function getOrCreateLote(arquivo: string): Promise<string> {
    if (loteCache.has(arquivo)) return loteCache.get(arquivo)!;
    const relatorio = relatoriosPorArquivo.get(arquivo);
    if (!relatorio) throw new Error(`Relatório "${arquivo}" não encontrado entre os relatórios enviados.`);

    const periodoInicio = brDateToIso(relatorio.periodoInicio);
    const periodoFim = brDateToIso(relatorio.periodoFim);
    if (!periodoInicio || !periodoFim) {
      throw new Error(`Relatório "${arquivo}" sem período reconhecido no cabeçalho.`);
    }

    const { data: existente } = await supabase
      .from("repasses_lotes")
      .select("id")
      .eq("periodo_inicio", periodoInicio)
      .eq("periodo_fim", periodoFim)
      .maybeSingle();
    if (existente) {
      loteCache.set(arquivo, existente.id);
      return existente.id;
    }

    const { data, error } = await supabase
      .from("repasses_lotes")
      .insert({
        arquivo,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        comissao_bruta_total: relatorio.comissaoBrutaTotal,
        status: "aguardando_nf",
        nf_info: null,
        nf_competencia: null,
        nf_arquivo_nome: null,
        nf_arquivo_base64: null,
        data_pagamento: null,
        valor_pago: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erro criando lote de repasse "${arquivo}": ${error.message}`);
    loteCache.set(arquivo, data.id);
    return data.id;
  }

  const seguradoraCache = new Map(ctx.seguradoras.map((s) => [normalize(s.nome), s.id]));
  const tipoProdutoCache = new Map(ctx.tiposProduto.map((t) => [normalizeCompact(t.nome), t.id]));
  const clienteCache = new Map(ctx.clientes.map((c) => [normalize(c.nome), c.id]));
  const producaoCache = new Map(ctx.producoes.filter((p) => p.num_proposta).map((p) => [p.num_proposta as string, p.id]));
  const repasseDedupe = new Set<string>();
  {
    const producaoIds = [...producaoCache.values()];
    if (producaoIds.length > 0) {
      const { data } = await supabase.from("repasses").select("producao_id, parcela").in("producao_id", producaoIds);
      for (const r of data ?? []) repasseDedupe.add(`${r.producao_id}::${r.parcela}`);
    }
  }

  async function getOrCreateSeguradora(nomeRaw: string): Promise<string> {
    const existente = matchByPrefix(nomeRaw, ctx.seguradoras);
    if (existente) return existente.id;
    const key = normalize(nomeRaw);
    if (seguradoraCache.has(key)) return seguradoraCache.get(key)!;
    const { data, error } = await supabase
      .from("seguradoras")
      .insert({ nome: nomeRaw.trim(), susep: null, cnpj: null, telefone: null, site: null, obs: null })
      .select("id")
      .single();
    if (error) throw new Error(`Erro criando seguradora "${nomeRaw}": ${error.message}`);
    seguradoraCache.set(key, data.id);
    ctx.seguradoras.push({ id: data.id, nome: nomeRaw.trim() });
    resultado.seguradorasCriadas++;
    return data.id;
  }

  async function getOrCreateTipoProduto(nomeRaw: string): Promise<string> {
    const existente = matchTipoProduto(nomeRaw, ctx.tiposProduto);
    if (existente) return existente.id;
    const key = normalizeCompact(nomeRaw);
    if (tipoProdutoCache.has(key)) return tipoProdutoCache.get(key)!;
    const { data, error } = await supabase
      .from("tipos_produto")
      .insert({ nome: nomeRaw.trim(), descricao: null })
      .select("id")
      .single();
    if (error) throw new Error(`Erro criando tipo de produto "${nomeRaw}": ${error.message}`);
    tipoProdutoCache.set(key, data.id);
    ctx.tiposProduto.push({ id: data.id, nome: nomeRaw.trim() });
    resultado.tiposProdutoCriados++;
    return data.id;
  }

  async function getOrCreateCliente(nomeRaw: string, tipoDoc: "cnpj" | "cpf"): Promise<string> {
    const key = normalize(nomeRaw);
    const existente = ctx.clientes.find((c) => normalize(c.nome) === key);
    if (existente) return existente.id;
    if (clienteCache.has(key)) return clienteCache.get(key)!;
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nome: nomeRaw.trim(),
        tipo_doc: tipoDoc,
        status: "prospect",
        fantasia: null,
        cnpj: null,
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
        obs: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erro criando cliente "${nomeRaw}": ${error.message}`);
    clienteCache.set(key, data.id);
    ctx.clientes.push({ id: data.id, nome: nomeRaw.trim() });
    resultado.clientesCriados++;
    return data.id;
  }

  async function getOrCreateProducao(linha: CommitLinhaInput, clienteId: string, tipoProdutoId: string, seguradoraId: string): Promise<string> {
    const existente = producaoCache.get(linha.propostaId);
    if (existente) return existente;
    const denom = linha.parcela.split("/")[1] ?? "1";
    const { data, error } = await supabase
      .from("producoes")
      .insert({
        cliente_id: clienteId,
        tipo_produto_id: tipoProdutoId,
        seguradora_id: seguradoraId,
        num_apolice: linha.apoliceEndosso,
        num_proposta: linha.propostaId,
        premio_mensal: null,
        premio_total: null,
        comissao_bruta_pct: linha.apolicePct,
        parcelas: `${denom}x`,
        vigencia_inicio: null,
        vigencia_fim: null,
        data_renovacao: null,
        status_manual: "ativa",
        vendedor_id: usuario.id,
        comissao_pct: null,
        obs: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erro criando produção (proposta ${linha.propostaId}): ${error.message}`);
    producaoCache.set(linha.propostaId, data.id);
    resultado.producoesCriadas++;
    return data.id;
  }

  for (const linha of linhas) {
    const loteId = await getOrCreateLote(linha.arquivo);
    const seguradoraId = await getOrCreateSeguradora(linha.companhiaNome);
    const tipoProdutoId = await getOrCreateTipoProduto(linha.ramoNome);
    const clienteId = await getOrCreateCliente(linha.seguradoNome, linha.tipoDocEscolhido);
    const producaoId = await getOrCreateProducao(linha, clienteId, tipoProdutoId, seguradoraId);

    const dedupeKey = `${producaoId}::${linha.parcela}`;
    if (repasseDedupe.has(dedupeKey)) {
      resultado.repassesIgnorados++;
      continue;
    }
    repasseDedupe.add(dedupeKey);

    const { error } = await supabase.from("repasses").insert({
      lote_id: loteId,
      producao_id: producaoId,
      parcela: linha.parcela,
      periodo: linha.periodo,
      comissao_bruta: linha.comissao,
      apolice_pct: linha.apolicePct,
      repasse_pct: linha.repassePct,
    });
    if (error) throw new Error(`Erro criando repasse (proposta ${linha.propostaId}, parcela ${linha.parcela}): ${error.message}`);
    resultado.repassesCriados++;
  }

  return resultado;
}
