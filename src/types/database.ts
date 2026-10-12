// Tipos manuais das tabelas do Supabase — schema em
// supabase/migrations/0001_core.sql.
//
// Se o projeto crescer, considere gerar isso automaticamente com:
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Nota: as tabelas usam `type` (não `interface`) de propósito — o TypeScript só
// trata um `type` de objeto como tendo assinatura de índice implícita em
// checagens `extends` (o que o generic Database do supabase-js exige);
// `interface` não recebe esse tratamento e quebra a inferência dos tipos.

export type Papel = "admin" | "vendedor";
export type StatusCliente = "prospect" | "ativo" | "inativo";
export type TipoDoc = "cnpj" | "cpf";
export type StatusProducao = "ativa" | "vencida" | "cancelada";
export type StatusRepasse = "aguardando_nf" | "aguardando_pagamento" | "pago";
export type TipoDespesa = "fixa" | "variavel" | "parcelada";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  tipo_doc: TipoDoc;
  cpf: string | null;
  cnpj: string | null;
  susep: string | null;
  whatsapp: string | null;
  pix: string | null;
  obs: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoProduto = {
  id: string;
  nome: string;
  descricao: string | null;
  bloqueada: boolean;
  created_at: string;
  updated_at: string;
};

export type Seguradora = {
  id: string;
  nome: string;
  susep: string | null;
  cnpj: string | null;
  telefone: string | null;
  site: string | null;
  obs: string | null;
  bloqueada: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoContatoSeguradora = "ponto_focal" | "financeiro" | "averbacao";

export type SeguradoraContato = {
  id: string;
  seguradora_id: string;
  tipo: TipoContatoSeguradora;
  nome: string;
  telefone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Cliente = {
  id: string;
  tipo_doc: TipoDoc;
  nome: string;
  fantasia: string | null;
  cnpj: string | null;
  cpf: string | null;
  nascimento: string | null;
  situacao: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  cnae: string | null;
  porte: string | null;
  tel: string | null;
  email_com: string | null;
  status: StatusCliente;
  obs: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteContato = {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  whatsapp: string | null;
  email: string | null;
  aniversario: string | null;
  created_at: string;
  updated_at: string;
};

export type Producao = {
  id: string;
  cliente_id: string;
  tipo_produto_id: string | null;
  seguradora_id: string | null;
  num_apolice: string | null;
  num_proposta: string | null;
  premio_mensal: number | null;
  premio_total: number | null;
  comissao_bruta_pct: number | null;
  comissao_avantar_pct: number | null;
  comissao_unidade_pct: number | null;
  parcelas: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_renovacao: string | null;
  status_manual: StatusProducao;
  vendedor_id: string | null;
  comissao_pct: number | null;
  obs: string | null;
  created_at: string;
  updated_at: string;
};

export type Followup = {
  id: string;
  producao_id: string;
  dias: number;
  motivo: string;
  due_date: string;
  concluido_em: string | null;
  created_at: string;
};

export type Repasse = {
  id: string;
  lote_id: string;
  producao_id: string;
  parcela: string | null;
  periodo: string;
  comissao_bruta: number | null;
  apolice_pct: number | null;
  repasse_pct: number | null;
  created_at: string;
  updated_at: string;
};

export type RepasseLote = {
  id: string;
  arquivo: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  comissao_bruta_total: number | null;
  status: StatusRepasse;
  nf_info: string | null;
  nf_competencia: string | null;
  nf_arquivo_nome: string | null;
  nf_arquivo_base64: string | null;
  data_pagamento: string | null;
  valor_pago: number | null;
  created_at: string;
  updated_at: string;
};

export type CrmColuna = {
  id: string;
  label: string;
  icon: string | null;
  color: string | null;
  sistema: boolean;
  bloqueada: boolean;
  nota: string | null;
  ordem: number;
};

export type Prospeccao = {
  id: string;
  empresa: string;
  cliente_id: string | null;
  tipo_produto_id: string | null;
  coluna_id: string;
  next_contact: string | null;
  obs: string | null;
  vendedor_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Tarefa = {
  id: string;
  titulo: string;
  data: string;
  descricao: string | null;
  concluida: boolean;
  vendedor_id: string | null;
  origem_despesa_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Despesa = {
  id: string;
  tipo: TipoDespesa;
  descricao: string;
  valor: number;
  categoria: string | null;
  dia_vencimento: number | null;
  data: string | null;
  parcelas_total: number | null;
  parcela_inicio: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
};

export type DespesaPagamento = {
  id: string;
  despesa_id: string;
  periodo: string;
  data_pagamento: string;
  created_at: string;
};

/** Valor de uma despesa fixa/parcelada, registrado por período — quando o
 * usuário altera o valor, um novo registro entra a partir do mês vigente,
 * sem reescrever o histórico de meses já fechados. */
export type DespesaHistoricoValor = {
  id: string;
  despesa_id: string;
  periodo: string;
  valor: number;
  created_at: string;
};

export type Settings = {
  id: true;
  aliquota_simples: number;
  meta_mensal: number;
  updated_at: string;
};

export type MetaMensal = {
  periodo: string;
  valor: number;
  gerado_automaticamente: boolean;
  created_at: string;
  updated_at: string;
};

export type ProspeccaoHistorico = {
  id: string;
  prospeccao_id: string;
  coluna_anterior: string;
  coluna_nova: string;
  nota: string;
  usuario_id: string | null;
  created_at: string;
};

export type FechamentoMensal = {
  periodo: string;
  das_numero_documento: string | null;
  das_vencimento: string | null;
  das_valor: number | null;
  das_arquivo_nome: string | null;
  das_arquivo_base64: string | null;
  fechado_em: string | null;
  fechado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type AmbienteNfse = "restrita" | "producao";
export type StatusNfseEmissao = "rascunho" | "assinado" | "enviando" | "autorizado" | "rejeitado" | "erro" | "cancelado";

export type NfseEmissao = {
  id: string;
  competencia: string;
  valor: number;
  serie_dps: string;
  numero_dps: number;
  ambiente: AmbienteNfse;
  status: StatusNfseEmissao;
  dps_xml: string | null;
  dps_xml_assinado: string | null;
  chave_acesso: string | null;
  numero_nfse: string | null;
  nfse_xml: string | null;
  motivo_rejeicao: string | null;
  erro_detalhe: string | null;
  payload_enviado: Record<string, unknown> | null;
  payload_resposta: Record<string, unknown> | null;
  repasse_lote_id: string | null;
  criado_por: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  transmitido_em: string | null;
  autorizado_em: string | null;
  evento_cancelamento_xml: string | null;
  motivo_cancelamento: string | null;
  cancelado_em: string | null;
  cancelado_por: string | null;
  created_at: string;
  updated_at: string;
};

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      usuarios: TableDef<Usuario, Omit<Usuario, "created_at" | "updated_at" | "ativo"> & Partial<Pick<Usuario, "ativo">>>;
      tipos_produto: TableDef<TipoProduto, Omit<TipoProduto, "id" | "created_at" | "updated_at" | "bloqueada"> & Partial<Pick<TipoProduto, "bloqueada">>>;
      seguradoras: TableDef<Seguradora, Omit<Seguradora, "id" | "created_at" | "updated_at" | "bloqueada"> & Partial<Pick<Seguradora, "bloqueada">>>;
      seguradoras_contatos: TableDef<SeguradoraContato, Omit<SeguradoraContato, "id" | "created_at" | "updated_at">>;
      clientes: TableDef<Cliente, Omit<Cliente, "id" | "created_at" | "updated_at" | "status"> & Partial<Pick<Cliente, "status">>>;
      clientes_contatos: TableDef<ClienteContato, Omit<ClienteContato, "id" | "created_at" | "updated_at">>;
      producoes: TableDef<Producao, Omit<Producao, "id" | "created_at" | "updated_at" | "comissao_avantar_pct" | "comissao_unidade_pct" | "status_manual"> & Partial<Pick<Producao, "status_manual">>>;
      followups: TableDef<Followup, Omit<Followup, "id" | "created_at">>;
      repasses: TableDef<Repasse, Omit<Repasse, "id" | "created_at" | "updated_at">>;
      repasses_lotes: TableDef<RepasseLote, Omit<RepasseLote, "id" | "created_at" | "updated_at" | "status"> & Partial<Pick<RepasseLote, "status">>>;
      crm_colunas: TableDef<CrmColuna, Omit<CrmColuna, "sistema" | "bloqueada" | "ordem"> & Partial<Pick<CrmColuna, "sistema" | "bloqueada" | "ordem">>>;
      prospeccoes: TableDef<Prospeccao, Omit<Prospeccao, "id" | "created_at" | "updated_at">>;
      prospeccoes_historico: TableDef<ProspeccaoHistorico, Omit<ProspeccaoHistorico, "id" | "created_at">>;
      tarefas: TableDef<Tarefa, Omit<Tarefa, "id" | "created_at" | "updated_at" | "concluida" | "origem_despesa_id"> & Partial<Pick<Tarefa, "concluida" | "origem_despesa_id">>>;
      despesas: TableDef<Despesa, Omit<Despesa, "id" | "created_at" | "updated_at" | "ativa" | "parcelas_total" | "parcela_inicio"> & Partial<Pick<Despesa, "ativa" | "parcelas_total" | "parcela_inicio">>>;
      despesas_pagamentos: TableDef<DespesaPagamento, Omit<DespesaPagamento, "id" | "created_at">>;
      despesas_historico_valores: TableDef<DespesaHistoricoValor, Omit<DespesaHistoricoValor, "id" | "created_at">>;
      settings: TableDef<Settings, Partial<Omit<Settings, "updated_at">>>;
      metas_mensais: TableDef<MetaMensal, Omit<MetaMensal, "created_at" | "updated_at" | "gerado_automaticamente"> & Partial<Pick<MetaMensal, "gerado_automaticamente">>>;
      fechamentos_mensais: TableDef<FechamentoMensal, Omit<FechamentoMensal, "created_at" | "updated_at">>;
      nfse_emissoes: TableDef<NfseEmissao, Omit<NfseEmissao, "id" | "created_at" | "updated_at" | "serie_dps" | "status"> & Partial<Pick<NfseEmissao, "serie_dps" | "status">>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
