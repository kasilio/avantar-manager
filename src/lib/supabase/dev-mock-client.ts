// Client "mock" usado só quando não há projeto Supabase configurado ainda
// (ver IS_MOCK_MODE em ./is-mock-mode.ts). Implementa, em memória, o
// subconjunto da API do supabase-js que o app usa (from/select/eq/neq/is/in/
// gte/lte/lt/order/limit/single/maybeSingle/insert/update/delete + auth.getUser/
// signInWithPassword/signOut), incluindo embeds aninhados de 1 nível por
// convenção de FK (`.select("*, producoes(clientes(nome))")`, ver
// resolveRowEmbeds), com os mesmos seeds de cadastro da migration
// (supabase/migrations/0001_core.sql), pra dar pra navegar e estruturar as
// telas sem depender de um backend real. Assim que `.env.local` tiver
// credenciais reais, IS_MOCK_MODE vira false e este arquivo deixa de ser
// usado — nenhum outro código muda.
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MOCK_NF_FILES } from "./mock-nf-files-base64";
import { FOLLOWUP_SCHEDULE } from "@/lib/followups-schedule";

export const MOCK_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const MOCK_VENDEDOR_ID = "00000000-0000-4000-8000-000000000002";

type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;

function iso(date: Date) {
  return date.toISOString();
}

function seedStore(): Store {
  const now = new Date();

  const result: Store = {
    usuarios: [
      {
        id: MOCK_ADMIN_ID,
        nome: "Matheus Villatore",
        email: "admin@local.test",
        papel: "admin",
        cpf: null,
        susep: "KJK90J",
        whatsapp: null,
        pix: null,
        obs: null,
        ativo: true,
        created_at: iso(now),
        updated_at: iso(now),
      },
      {
        id: MOCK_VENDEDOR_ID,
        nome: "Vendedor Demo",
        email: "vendedor@local.test",
        papel: "vendedor",
        cpf: null,
        susep: null,
        whatsapp: null,
        pix: null,
        obs: null,
        ativo: true,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    tipos_produto: [
      { id: "20000000-0000-4000-8000-000000000001", nome: "TRANSPORTE-TR", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000002", nome: "FROTA", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000003", nome: "AUTOMÓVEL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000004", nome: "VIDA MOTORISTA", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000005", nome: "PATRIMONIAL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000006", nome: "RC GERAL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000007", nome: "OUTRO", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000008", nome: "EMPRESARIAL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
    ],
    seguradoras: [
      { id: "30000000-0000-4000-8000-000000000001", nome: "Porto Seguro", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000002", nome: "HDI Seguros", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000003", nome: "Allianz", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000004", nome: "Bradesco Seguros", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000005", nome: "Tokio Marine", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000006", nome: "Yelum", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000007", nome: "Ezze Seguros", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000008", nome: "Justos Seguros", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
    ],
    crm_colunas: [
      { id: "novo", label: "Novo Lead", icon: "🆕", color: "var(--blue)", sistema: true, bloqueada: true, nota: null, ordem: 1 },
      { id: "contato", label: "Em Contato", icon: "💬", color: "var(--gold)", sistema: true, bloqueada: true, nota: null, ordem: 2 },
      { id: "levantamento", label: "Levantamento de Necessidades", icon: "🔎", color: "var(--blue)", sistema: true, bloqueada: true, nota: null, ordem: 3 },
      { id: "proposta", label: "Proposta / Apresentação", icon: "📄", color: "var(--amber)", sistema: true, bloqueada: true, nota: null, ordem: 4 },
      { id: "fechado", label: "Fechado", icon: "✅", color: "var(--green)", sistema: true, bloqueada: true, nota: null, ordem: 5 },
      { id: "perdido", label: "Perdido", icon: "❌", color: "var(--red)", sistema: true, bloqueada: true, nota: null, ordem: 6 },
      { id: "followup", label: "Follow-up", icon: "🔁", color: "var(--purple)", sistema: true, bloqueada: true, nota: "Reagendado automaticamente 2 meses após \"Perdido\"", ordem: 7 },
    ],
    clientes: [
      { id: "40000000-0000-4000-8000-000000000001", tipo_doc: "cnpj", nome: "E. MARQUES & MARQUES NEGOCIOS LTDA", fantasia: null, cnpj: "48.075.273/0001-21", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 98480-7525", email_com: "Jackson@emarquesnegocios.com.br", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000002", tipo_doc: "cnpj", nome: "E. MARQUES E J. MARQUES", fantasia: null, cnpj: "64.105.789/0001-28", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 9193-1435", email_com: "Logistica@emarquesnegocios.com.br", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000003", tipo_doc: "cpf", nome: "REBECA DE CARVALHO FERREIRA", fantasia: null, cnpj: null, cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: null, email_com: null, status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000004", tipo_doc: "cnpj", nome: "BERK LOG LTDA", fantasia: null, cnpj: "58.528.633/0001-57", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 98768-7918", email_com: "comercial@berklog.com.br", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000005", tipo_doc: "cnpj", nome: "LAL TRANSPORTES DE CARGAS LTDA", fantasia: null, cnpj: "20.799.602/0001-68", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99860-4848", email_com: "laltransportes1@outlook.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000006", tipo_doc: "cpf", nome: "ELAINE RIBEIRO LOBO", fantasia: null, cnpj: null, cpf: "971.223.359-68", nascimento: "1978-03-07", situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99693-6280", email_com: null, status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000007", tipo_doc: "cnpj", nome: "AGROFRUTAS COMERCIO DE FRUTAS LTDA", fantasia: null, cnpj: "27.045.978/0001-26", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(51) 99950-8700, (51) 99505-7166", email_com: "rr4893935@gmail.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000008", tipo_doc: "cnpj", nome: "MARQUES TRANSPORTES E NEGOCIOS LTDA", fantasia: null, cnpj: "66.788.658/0001-18", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 98480-7525", email_com: "jackson.lmarques@gmail.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000009", tipo_doc: "cnpj", nome: "PVN APOIO A EDUCACAO A DISTANCIA LT", fantasia: null, cnpj: null, cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: null, email_com: null, status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000010", tipo_doc: "cpf", nome: "RODRIGO ALMEIDA DO AMARAL", fantasia: null, cnpj: null, cpf: "074.414.859-67", nascimento: "1991-06-26", situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99537-9699", email_com: "rodrigo.tsw14@gmail.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000011", tipo_doc: "cpf", nome: "MILTON EURICO BACELLAR JUNIOR", fantasia: null, cnpj: null, cpf: "031.092.459-65", nascimento: "1981-07-15", situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99271-4814", email_com: "milton.bacellar@gmail.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000012", tipo_doc: "cnpj", nome: "A J T TRANSPORTE LOGISTICA LTDA", fantasia: null, cnpj: "63.056.123/0001-64", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(12) 98882-9404", email_com: "comercial@ajttransplog.com.br", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000013", tipo_doc: "cnpj", nome: "ESTRELA NOVA TRANSPORTES LTDA", fantasia: null, cnpj: "18.454.679/0001-54", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99288-6361", email_com: "heriogomes@gmail.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000014", tipo_doc: "cpf", nome: "GABRIEL EDUARDO TARESZKIEWICZ", fantasia: null, cnpj: null, cpf: "119.110.819-85", nascimento: "1997-12-02", situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 99145-0805", email_com: "gabeeduardo@icloud.com", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "40000000-0000-4000-8000-000000000015", tipo_doc: "cnpj", nome: "JWMF TRANSPORTES E LOGISTICA LTDA", fantasia: null, cnpj: "23.918.066/0001-60", cpf: null, nascimento: null, situacao: null, cep: null, logradouro: null, numero: null, bairro: null, cidade: null, cnae: null, porte: null, tel: "(41) 98836-3242", email_com: "WILMAR.MATOZO@JWMF.COM.BR", status: "prospect", obs: null, created_at: iso(now), updated_at: iso(now) },
    ],
    clientes_contatos: [],
    producoes: [
      { id: "50000000-0000-4000-8000-000000000001", cliente_id: "40000000-0000-4000-8000-000000000001", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000006", num_apolice: "31.08.2025.0547853", num_proposta: "46040", premio_mensal: null, premio_total: null, comissao_bruta_pct: 18, comissao_avantar_pct: 6.3, comissao_unidade_pct: 11.7, parcelas: "10x", vigencia_inicio: "2025-12-29", vigencia_fim: "2026-12-29", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000002", cliente_id: "40000000-0000-4000-8000-000000000003", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000003", num_apolice: "517720264W310297048", num_proposta: "47849", premio_mensal: null, premio_total: null, comissao_bruta_pct: 18, comissao_avantar_pct: 6.3, comissao_unidade_pct: 11.7, parcelas: "10x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000003", cliente_id: "40000000-0000-4000-8000-000000000001", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040037280000", num_proposta: "46133", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-01-01", vigencia_fim: "2026-07-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000004", cliente_id: "40000000-0000-4000-8000-000000000001", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0654 06 0040052040000", num_proposta: "46131", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-01-01", vigencia_fim: "2026-07-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000005", cliente_id: "40000000-0000-4000-8000-000000000002", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040037290000", num_proposta: "46134", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-01-01", vigencia_fim: "2026-07-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000006", cliente_id: "40000000-0000-4000-8000-000000000002", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0654 06 0040052050000", num_proposta: "46132", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-01-01", vigencia_fim: "2026-07-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000007", cliente_id: "40000000-0000-4000-8000-000000000004", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000005", num_apolice: "540 00103059", num_proposta: "48392", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-02-19", vigencia_fim: "2027-02-19", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000008", cliente_id: "40000000-0000-4000-8000-000000000004", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000005", num_apolice: "550 00101517", num_proposta: "48391", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: "2026-02-19", vigencia_fim: "2027-02-19", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000009", cliente_id: "40000000-0000-4000-8000-000000000005", tipo_produto_id: "20000000-0000-4000-8000-000000000002", seguradora_id: "30000000-0000-4000-8000-000000000002", num_apolice: "01.035.131.034174", num_proposta: "50511", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "10x", vigencia_inicio: "2026-04-01", vigencia_fim: "2027-04-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000010", cliente_id: "40000000-0000-4000-8000-000000000005", tipo_produto_id: "20000000-0000-4000-8000-000000000002", seguradora_id: "30000000-0000-4000-8000-000000000002", num_apolice: "01.035.131.034174 / 0001", num_proposta: "53283", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "1x", vigencia_inicio: "2026-04-01", vigencia_fim: "2027-04-01", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000011", cliente_id: "40000000-0000-4000-8000-000000000006", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000007", num_apolice: "1003100135942", num_proposta: "55696", premio_mensal: null, premio_total: null, comissao_bruta_pct: 10, comissao_avantar_pct: 3.5, comissao_unidade_pct: 6.5, parcelas: "3x", vigencia_inicio: "2026-07-03", vigencia_fim: "2027-07-03", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000012", cliente_id: "40000000-0000-4000-8000-000000000005", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "0040045960000", num_proposta: "56590", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000013", cliente_id: "40000000-0000-4000-8000-000000000005", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "0040062890000", num_proposta: "56592", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000014", cliente_id: "40000000-0000-4000-8000-000000000007", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0654 06 0040055570000", num_proposta: "49088", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "1x", vigencia_inicio: "2026-03-05", vigencia_fim: "2027-03-05", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000015", cliente_id: "40000000-0000-4000-8000-000000000007", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040039790000", num_proposta: "49086", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "1x", vigencia_inicio: "2026-03-05", vigencia_fim: "2027-03-05", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000016", cliente_id: "40000000-0000-4000-8000-000000000008", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000004", num_apolice: "54044", num_proposta: "57360", premio_mensal: null, premio_total: null, comissao_bruta_pct: 10, comissao_avantar_pct: 3.5, comissao_unidade_pct: 6.5, parcelas: "10x", vigencia_inicio: "2026-07-31", vigencia_fim: "2027-07-31", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000017", cliente_id: "40000000-0000-4000-8000-000000000008", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040043590000", num_proposta: "54530", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000018", cliente_id: "40000000-0000-4000-8000-000000000008", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0654 06 0040060740000", num_proposta: "54531", premio_mensal: null, premio_total: null, comissao_bruta_pct: 25, comissao_avantar_pct: 8.75, comissao_unidade_pct: 16.25, parcelas: "12x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000019", cliente_id: "40000000-0000-4000-8000-000000000009", tipo_produto_id: "20000000-0000-4000-8000-000000000008", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "6 118 4232519", num_proposta: "57319", premio_mensal: null, premio_total: null, comissao_bruta_pct: 23, comissao_avantar_pct: 8.05, comissao_unidade_pct: 14.95, parcelas: "6x", vigencia_inicio: null, vigencia_fim: null, data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000020", cliente_id: "40000000-0000-4000-8000-000000000010", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000008", num_apolice: "02241202605311343320", num_proposta: "57348", premio_mensal: null, premio_total: null, comissao_bruta_pct: 5, comissao_avantar_pct: 1.75, comissao_unidade_pct: 3.25, parcelas: "10x", vigencia_inicio: "2026-07-31", vigencia_fim: "2027-07-30", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000021", cliente_id: "40000000-0000-4000-8000-000000000011", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "06 26 0531 29035625", num_proposta: "54161", premio_mensal: null, premio_total: null, comissao_bruta_pct: 10, comissao_avantar_pct: 3.5, comissao_unidade_pct: 6.5, parcelas: "10x", vigencia_inicio: "2026-06-06", vigencia_fim: "2027-06-06", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: null, created_at: iso(now), updated_at: iso(now) },
      // Achadas na pasta APÓLICES/ sem produção correspondente ainda —
      // comissão %/proposta não vêm no PDF da apólice, ajustar manualmente.
      { id: "50000000-0000-4000-8000-000000000022", cliente_id: "40000000-0000-4000-8000-000000000015", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040047270000", num_proposta: null, premio_mensal: null, premio_total: null, comissao_bruta_pct: null, comissao_avantar_pct: null, comissao_unidade_pct: null, parcelas: null, vigencia_inicio: "2026-08-03", vigencia_fim: "2027-08-03", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: "Cadastrada a partir da apólice — comissão e proposta pendentes.", created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000023", cliente_id: "40000000-0000-4000-8000-000000000015", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0654 06 0040064180000", num_proposta: null, premio_mensal: null, premio_total: null, comissao_bruta_pct: null, comissao_avantar_pct: null, comissao_unidade_pct: null, parcelas: null, vigencia_inicio: "2026-08-03", vigencia_fim: "2027-08-03", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: "Cadastrada a partir da apólice — comissão e proposta pendentes.", created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000024", cliente_id: "40000000-0000-4000-8000-000000000012", tipo_produto_id: "20000000-0000-4000-8000-000000000001", seguradora_id: "30000000-0000-4000-8000-000000000001", num_apolice: "001 0655 06 0040047730000", num_proposta: null, premio_mensal: null, premio_total: null, comissao_bruta_pct: null, comissao_avantar_pct: null, comissao_unidade_pct: null, parcelas: null, vigencia_inicio: "2026-08-12", vigencia_fim: "2027-08-12", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: "Cadastrada a partir da apólice — comissão e proposta pendentes.", created_at: iso(now), updated_at: iso(now) },
      { id: "50000000-0000-4000-8000-000000000025", cliente_id: "40000000-0000-4000-8000-000000000010", tipo_produto_id: "20000000-0000-4000-8000-000000000003", seguradora_id: "30000000-0000-4000-8000-000000000006", num_apolice: "31.08.2026.0559071", num_proposta: null, premio_mensal: null, premio_total: null, comissao_bruta_pct: null, comissao_avantar_pct: null, comissao_unidade_pct: null, parcelas: null, vigencia_inicio: "2026-09-09", vigencia_fim: "2027-09-09", data_renovacao: null, status_manual: "ativa", vendedor_id: MOCK_ADMIN_ID, comissao_pct: null, obs: "Cadastrada a partir da apólice — comissão e proposta pendentes. Rodrigo já tinha outra apólice (Justos) além desta.", created_at: iso(now), updated_at: iso(now) },
    ],
    followups: [],
    ...(() => {
      // Comissões por linha (producao_id, parcela) -> valor — os mesmos 50
      // repasses reais da migration 0003/0004, agora ligados ao lote correto
      // (ver periodo abaixo) em vez de "periodo" livre.
      const comissaoPorLinha: [string, string, string, number, number][] = [
        ["50000000-0000-4000-8000-000000000001", "1/10", "2026-01", 449.68, 18],
        ["50000000-0000-4000-8000-000000000001", "2/10", "2026-02", 449.72, 18],
        ["50000000-0000-4000-8000-000000000002", "1/10", "2026-02", 190.78, 18],
        ["50000000-0000-4000-8000-000000000003", "1/12", "2026-02", 149.59, 25],
        ["50000000-0000-4000-8000-000000000003", "2/12", "2026-03", 516.87, 25],
        ["50000000-0000-4000-8000-000000000003", "3/12", "2026-05", 930.46, 25],
        ["50000000-0000-4000-8000-000000000003", "4/12", "2026-06", 884.63, 25],
        ["50000000-0000-4000-8000-000000000003", "5/12", "2026-06", 838.47, 25],
        ["50000000-0000-4000-8000-000000000003", "6/12", "2026-07", 1020.86, 25],
        ["50000000-0000-4000-8000-000000000003", "7/12", "2026-09", 4.72, 25],
        ["50000000-0000-4000-8000-000000000004", "1/12", "2026-02", 442.09, 25],
        ["50000000-0000-4000-8000-000000000004", "2/12", "2026-03", 809.37, 25],
        ["50000000-0000-4000-8000-000000000004", "3/12", "2026-05", 1222.97, 25],
        ["50000000-0000-4000-8000-000000000004", "4/12", "2026-06", 1177.14, 25],
        ["50000000-0000-4000-8000-000000000004", "5/12", "2026-06", 1130.99, 25],
        ["50000000-0000-4000-8000-000000000004", "6/12", "2026-07", 1313.39, 25],
        ["50000000-0000-4000-8000-000000000004", "7/12", "2026-09", 14.16, 25],
        ["50000000-0000-4000-8000-000000000005", "1/12", "2026-02", 146.25, 25],
        ["50000000-0000-4000-8000-000000000005", "2/12", "2026-03", 291.82, 25],
        ["50000000-0000-4000-8000-000000000005", "3/12", "2026-04", 436.07, 25],
        ["50000000-0000-4000-8000-000000000005", "4/12", "2026-05", 503.93, 25],
        ["50000000-0000-4000-8000-000000000005", "5/12", "2026-06", 345.72, 25],
        ["50000000-0000-4000-8000-000000000005", "6/12", "2026-07", 550.60, 25],
        ["50000000-0000-4000-8000-000000000005", "7/12", "2026-09", 4.72, 25],
        ["50000000-0000-4000-8000-000000000006", "1/12", "2026-02", 438.75, 25],
        ["50000000-0000-4000-8000-000000000006", "2/12", "2026-03", 584.34, 25],
        ["50000000-0000-4000-8000-000000000006", "3/12", "2026-04", 728.60, 25],
        ["50000000-0000-4000-8000-000000000006", "4/12", "2026-05", 796.45, 25],
        ["50000000-0000-4000-8000-000000000006", "5/12", "2026-06", 638.23, 25],
        ["50000000-0000-4000-8000-000000000006", "6/12", "2026-07", 843.13, 25],
        ["50000000-0000-4000-8000-000000000006", "7/12", "2026-09", 14.16, 25],
        ["50000000-0000-4000-8000-000000000007", "1/12", "2026-05", 26.64, 25],
        ["50000000-0000-4000-8000-000000000008", "1/12", "2026-05", 26.64, 25],
        ["50000000-0000-4000-8000-000000000009", "1/10", "2026-05", 12154.21, 25],
        ["50000000-0000-4000-8000-000000000009", "2/10", "2026-06", 12154.21, 25],
        ["50000000-0000-4000-8000-000000000009", "3/10", "2026-07", 6077.12, 25],
        ["50000000-0000-4000-8000-000000000010", "1/1", "2026-05", 334.40, 25],
        ["50000000-0000-4000-8000-000000000011", "1/3", "2026-07", 109.98, 10],
        ["50000000-0000-4000-8000-000000000012", "1/12", "2026-09", 588.80, 25],
        ["50000000-0000-4000-8000-000000000013", "1/12", "2026-09", 671.25, 25],
        ["50000000-0000-4000-8000-000000000014", "1/1", "2026-08", 91.99, 25],
        ["50000000-0000-4000-8000-000000000015", "1/1", "2026-08", 99.07, 25],
        ["50000000-0000-4000-8000-000000000016", "1/10", "2026-08", 643.57, 10],
        ["50000000-0000-4000-8000-000000000017", "1/12", "2026-08", 68.25, 25],
        ["50000000-0000-4000-8000-000000000017", "2/12", "2026-09", 1489.54, 25],
        ["50000000-0000-4000-8000-000000000018", "1/12", "2026-08", 204.75, 25],
        ["50000000-0000-4000-8000-000000000018", "2/12", "2026-09", 1782.07, 25],
        ["50000000-0000-4000-8000-000000000019", "1/6", "2026-08", 64.62, 23],
        ["50000000-0000-4000-8000-000000000020", "1/10", "2026-08", 76.83, 5],
        ["50000000-0000-4000-8000-000000000021", "1/10", "2026-06", 220.94, 10],
      ];
      const comissaoMap = new Map(comissaoPorLinha.map(([pid, parc, , valor]) => [`${pid}|${parc}`, valor]));
      const apolicePctMap = new Map(comissaoPorLinha.map(([pid, parc, , , pct]) => [`${pid}|${parc}`, pct]));

      // Reconciliação real: cada grupo abaixo = 1 NFS-e efetivamente emitida
      // e conferida (pasta NFS/), com o período/valor exatos batendo com a
      // soma das linhas cobertas (ver conversa — 14 das 15 notas emitidas
      // até 09/2026 tiveram valor e competência lidos do PDF; a NFS-e 12 é
      // uma imagem escaneada sem texto selecionável, então seu valor
      // — R$ 1.969,46 — e o período — 11 a 16/06 — foram inferidos por
      // diferença exata em relação ao total do mês e às notas 10/11
      // vizinhas, não lidos diretamente do arquivo).
      const grupos: { nf: string; inicio: string; fim: string; pago: string; linhas: [string, string][] }[] = [
        { nf: "1", inicio: "2026-01-01", fim: "2026-01-15", pago: "2026-03-04", linhas: [["50000000-0000-4000-8000-000000000001", "1/10"]] },
        { nf: "2", inicio: "2026-02-01", fim: "2026-02-13", pago: "2026-03-04", linhas: [["50000000-0000-4000-8000-000000000002", "1/10"]] },
        { nf: "3", inicio: "2026-02-14", fim: "2026-02-28", pago: "2026-03-04", linhas: [["50000000-0000-4000-8000-000000000001", "2/10"], ["50000000-0000-4000-8000-000000000003", "1/12"], ["50000000-0000-4000-8000-000000000004", "1/12"], ["50000000-0000-4000-8000-000000000005", "1/12"], ["50000000-0000-4000-8000-000000000006", "1/12"]] },
        { nf: "4", inicio: "2026-03-01", fim: "2026-03-30", pago: "2026-03-30", linhas: [["50000000-0000-4000-8000-000000000003", "2/12"], ["50000000-0000-4000-8000-000000000004", "2/12"], ["50000000-0000-4000-8000-000000000005", "2/12"], ["50000000-0000-4000-8000-000000000006", "2/12"]] },
        { nf: "6", inicio: "2026-04-01", fim: "2026-04-30", pago: "2026-04-30", linhas: [["50000000-0000-4000-8000-000000000005", "3/12"], ["50000000-0000-4000-8000-000000000006", "3/12"]] },
        { nf: "7", inicio: "2026-05-01", fim: "2026-05-08", pago: "2026-05-09", linhas: [["50000000-0000-4000-8000-000000000003", "3/12"], ["50000000-0000-4000-8000-000000000004", "3/12"]] },
        { nf: "8", inicio: "2026-05-09", fim: "2026-05-20", pago: "2026-05-20", linhas: [["50000000-0000-4000-8000-000000000007", "1/12"], ["50000000-0000-4000-8000-000000000008", "1/12"], ["50000000-0000-4000-8000-000000000009", "1/10"]] },
        { nf: "9", inicio: "2026-05-21", fim: "2026-05-28", pago: "2026-05-28", linhas: [["50000000-0000-4000-8000-000000000005", "4/12"], ["50000000-0000-4000-8000-000000000006", "4/12"], ["50000000-0000-4000-8000-000000000010", "1/1"]] },
        { nf: "10", inicio: "2026-06-01", fim: "2026-06-10", pago: "2026-06-10", linhas: [["50000000-0000-4000-8000-000000000003", "4/12"], ["50000000-0000-4000-8000-000000000004", "4/12"]] },
        { nf: "12", inicio: "2026-06-11", fim: "2026-06-16", pago: "2026-06-16", linhas: [["50000000-0000-4000-8000-000000000003", "5/12"], ["50000000-0000-4000-8000-000000000004", "5/12"]] },
        { nf: "11", inicio: "2026-06-17", fim: "2026-06-22", pago: "2026-06-22", linhas: [["50000000-0000-4000-8000-000000000005", "5/12"], ["50000000-0000-4000-8000-000000000006", "5/12"], ["50000000-0000-4000-8000-000000000009", "2/10"], ["50000000-0000-4000-8000-000000000021", "1/10"]] },
        { nf: "13", inicio: "2026-07-01", fim: "2026-07-30", pago: "2026-07-30", linhas: [["50000000-0000-4000-8000-000000000003", "6/12"], ["50000000-0000-4000-8000-000000000004", "6/12"], ["50000000-0000-4000-8000-000000000005", "6/12"], ["50000000-0000-4000-8000-000000000006", "6/12"], ["50000000-0000-4000-8000-000000000009", "3/10"], ["50000000-0000-4000-8000-000000000011", "1/3"]] },
        { nf: "14", inicio: "2026-08-01", fim: "2026-08-07", pago: "2026-08-07", linhas: [["50000000-0000-4000-8000-000000000017", "1/12"], ["50000000-0000-4000-8000-000000000018", "1/12"], ["50000000-0000-4000-8000-000000000019", "1/6"], ["50000000-0000-4000-8000-000000000020", "1/10"]] },
        { nf: "15", inicio: "2026-08-08", fim: "2026-08-20", pago: "2026-08-20", linhas: [["50000000-0000-4000-8000-000000000014", "1/1"], ["50000000-0000-4000-8000-000000000015", "1/1"], ["50000000-0000-4000-8000-000000000016", "1/10"]] },
        { nf: "16", inicio: "2026-09-01", fim: "2026-09-10", pago: "2026-09-10", linhas: [["50000000-0000-4000-8000-000000000003", "7/12"], ["50000000-0000-4000-8000-000000000004", "7/12"], ["50000000-0000-4000-8000-000000000005", "7/12"], ["50000000-0000-4000-8000-000000000006", "7/12"], ["50000000-0000-4000-8000-000000000012", "1/12"], ["50000000-0000-4000-8000-000000000013", "1/12"], ["50000000-0000-4000-8000-000000000017", "2/12"], ["50000000-0000-4000-8000-000000000018", "2/12"]] },
      ];

      const loteIdPorNf = new Map(grupos.map((g, i) => [g.nf, `80000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`]));

      const repasses_lotes = grupos.map((g) => {
        const total = Math.round(g.linhas.reduce((sum, [pid, parc]) => sum + (comissaoMap.get(`${pid}|${parc}`) ?? 0), 0) * 100) / 100;
        const arquivo = MOCK_NF_FILES[g.nf];
        return {
          id: loteIdPorNf.get(g.nf)!,
          arquivo: arquivo?.nome ?? null,
          periodo_inicio: g.inicio,
          periodo_fim: g.fim,
          comissao_bruta_total: total,
          status: "pago",
          nf_info: g.nf,
          nf_competencia: g.fim,
          nf_arquivo_nome: arquivo?.nome ?? null,
          nf_arquivo_base64: arquivo?.base64 ?? null,
          data_pagamento: g.pago,
          valor_pago: total,
          created_at: iso(now),
          updated_at: iso(now),
        };
      });

      const repasses: Row[] = [];
      let seq = 1;
      for (const g of grupos) {
        for (const [producao_id, parcela] of g.linhas) {
          const periodo = comissaoPorLinha.find(([pid, parc]) => pid === producao_id && parc === parcela)![2];
          repasses.push({
            id: `70000000-0000-4000-8000-${String(seq++).padStart(12, "0")}`,
            lote_id: loteIdPorNf.get(g.nf)!,
            producao_id,
            parcela,
            periodo,
            comissao_bruta: comissaoMap.get(`${producao_id}|${parcela}`) ?? 0,
            apolice_pct: apolicePctMap.get(`${producao_id}|${parcela}`) ?? 25,
            repasse_pct: 65,
            created_at: iso(now),
            updated_at: iso(now),
          });
        }
      }

      return { repasses_lotes, repasses };
    })(),
    prospeccoes: [],
    prospeccoes_historico: [],
    tarefas: [],
    despesas: [],
    despesas_pagamentos: [],
    despesas_historico_valores: [],
    settings: [{ id: true, aliquota_simples: 6, meta_mensal: 15000, updated_at: iso(now) }],
    metas_mensais: [],
    fechamentos_mensais: [],
    seguradoras_contatos: [],
  };

  // Backfill do fluxo de relacionamento pras produções do seed (o trigger só
  // dispara em INSERT novo — ver gerarFollowupsRows / migration 0006). Duas
  // produções de Transporte do mesmo cliente no mesmo dia (ex. RC-DC +
  // RCTR-C da mesma negociação) contam como um pacote só — só a primeira
  // gera o fluxo de follow-up, ver migration 0014.
  const tiposProdutoSeed = result.tipos_produto as Row[];
  const producoesSeed = result.producoes as Row[];
  result.followups = producoesSeed.flatMap((p, idx) => {
    const base = ((p.vigencia_inicio as string | null) ?? (p.created_at as string)).slice(0, 10);
    if (isTransporteTipo(p.tipo_produto_id, tiposProdutoSeed)) {
      const jaCoberta = producoesSeed.some(
        (outra, outraIdx) =>
          outraIdx < idx &&
          outra.cliente_id === p.cliente_id &&
          isTransporteTipo(outra.tipo_produto_id, tiposProdutoSeed) &&
          ((outra.vigencia_inicio as string | null) ?? (outra.created_at as string)).slice(0, 10) === base
      );
      if (jaCoberta) return [];
    }
    return gerarFollowupsRows(p.id as string, base, iso(now));
  });

  return result;
}

/** Transporte tem ramos que costumam sair em mais de uma produção pro mesmo
 * cliente no mesmo dia — ver gerar_followups()/migration 0014. */
function isTransporteTipo(tipoProdutoId: unknown, tiposProduto: Row[]): boolean {
  const tp = tiposProduto.find((t) => t.id === tipoProdutoId);
  return typeof tp?.nome === "string" && tp.nome.toUpperCase().includes("TRANSPORTE");
}

const globalForMock = globalThis as unknown as { __avantarMockStore?: Store };
const store = globalForMock.__avantarMockStore ?? (globalForMock.__avantarMockStore = seedStore());

function nextId() {
  return crypto.randomUUID();
}

/** Simula o trigger `gerar_followups()` (supabase/migrations/0006_...sql) —
 * o mock não roda triggers de Postgres, então replica o mesmo efeito aqui
 * pra dar pra testar o fluxo de relacionamento localmente. */
function gerarFollowupsRows(producaoId: string, baseIso: string, now: string): Row[] {
  const [y, m, d] = baseIso.slice(0, 10).split("-").map(Number);
  const base = new Date(y, (m ?? 1) - 1, d ?? 1);
  return FOLLOWUP_SCHEDULE.map((etapa) => {
    const due = new Date(base);
    due.setDate(due.getDate() + etapa.dias);
    return {
      id: nextId(),
      producao_id: producaoId,
      dias: etapa.dias,
      motivo: etapa.motivo,
      due_date: due.toISOString().slice(0, 10),
      concluido_em: null,
      created_at: now,
    };
  });
}

// Resolução de embeds aninhados (`.select("*, producoes(clientes(nome))")`)
// por convenção de nome de FK — o app só faz embeds de muitos-pra-um
// (`<tabela_singular>_id` na linha de origem apontando pro `id` da tabela
// embutida), então não precisa de um motor PostgREST completo.
const FK_COLUMN_BY_TABLE: Record<string, string> = {
  producoes: "producao_id",
  clientes: "cliente_id",
  tipos_produto: "tipo_produto_id",
  seguradoras: "seguradora_id",
  repasses_lotes: "lote_id",
  usuarios: "vendedor_id",
};

interface EmbedSpec {
  table: string;
  inner: string;
}

/** Separa "a, b, tabela(c, d(e))" em segmentos de topo, sem quebrar dentro
 * de parênteses aninhados. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(input.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(input.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseEmbeds(columns?: string): EmbedSpec[] {
  if (!columns) return [];
  const embeds: EmbedSpec[] = [];
  for (const segment of splitTopLevel(columns)) {
    const m = segment.match(/^(\w+)\(([\s\S]*)\)$/);
    if (m) embeds.push({ table: m[1], inner: m[2] });
  }
  return embeds;
}

function resolveRowEmbeds(row: Row, columns?: string): Row {
  const embeds = parseEmbeds(columns);
  if (embeds.length === 0) return row;
  const result: Row = { ...row };
  for (const embed of embeds) {
    const fkCol = FK_COLUMN_BY_TABLE[embed.table] ?? `${embed.table.replace(/s$/, "")}_id`;
    const target = (store[embed.table] ?? []).find((t) => t.id === row[fkCol]) ?? null;
    result[embed.table] = target ? resolveRowEmbeds(target, embed.inner) : null;
  }
  return result;
}

type MockResult = { data: unknown; error: { message: string } | null; count: number | null };

class MockQueryBuilder implements PromiseLike<MockResult> {
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | undefined;
  private filters: Array<(row: Row) => boolean> = [];
  private orderCol: string | undefined;
  private orderAsc = true;
  private limitN: number | undefined;
  private wantSingle = false;
  private wantMaybeSingle = false;
  private wantCount = false;
  private columnsStr: string | undefined;

  constructor(private table: string) {}

  select(columns?: string, opts?: { count?: string; head?: boolean }) {
    this.columnsStr = columns;
    if (opts?.count) this.wantCount = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  is(column: string, value: null | boolean) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.filters.push((row) => row[column] !== value);
    } else if (operator === "eq") {
      this.filters.push((row) => row[column] !== value);
    }
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push((row) => {
      const cell = row[column];
      return cell != null && String(cell) >= String(value);
    });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push((row) => {
      const cell = row[column];
      return cell != null && String(cell) <= String(value);
    });
    return this;
  }
  lt(column: string, value: unknown) {
    this.filters.push((row) => {
      const cell = row[column];
      return cell != null && String(cell) < String(value);
    });
    return this;
  }
  order(column: string, opts?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.mode = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.mode = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.mode = "delete";
    return this;
  }
  single() {
    this.wantSingle = true;
    return this;
  }
  maybeSingle() {
    this.wantMaybeSingle = true;
    return this;
  }

  private execute(): MockResult {
    const rows = store[this.table] ?? (store[this.table] = []);
    const now = iso(new Date());

    if (this.mode === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
      const inserted: Row[] = items.map((item) => ({
        id: nextId(),
        created_at: now,
        updated_at: now,
        // Reproduz os `not null default ...` da migration que os call sites
        // legitimamente omitem no insert (ver despesas.ativa e
        // tarefas.concluida em 0001_core.sql) — sem isso, .eq("ativa", true)
        // e .eq("concluida", false) nunca batem em modo mock.
        ...(this.table === "despesas" ? { ativa: true } : {}),
        ...(this.table === "tarefas" ? { concluida: false } : {}),
        ...item,
      }));
      rows.push(...inserted);
      if (this.table === "producoes") {
        const followups = store["followups"] ?? (store["followups"] = []);
        const tiposProduto = store["tipos_produto"] ?? [];
        const todasProducoes = rows; // já inclui as recém-inseridas (rows === store["producoes"])
        for (const p of inserted) {
          const base = (typeof p.vigencia_inicio === "string" ? p.vigencia_inicio : now).slice(0, 10);
          const jaCoberta =
            isTransporteTipo(p.tipo_produto_id, tiposProduto) &&
            todasProducoes.some(
              (outra) =>
                outra.id !== p.id &&
                outra.cliente_id === p.cliente_id &&
                isTransporteTipo(outra.tipo_produto_id, tiposProduto) &&
                ((typeof outra.vigencia_inicio === "string" ? outra.vigencia_inicio : (outra.created_at as string)) as string).slice(0, 10) === base
            );
          if (!jaCoberta) {
            followups.push(...gerarFollowupsRows(p.id as string, base, now));
          }
        }
      }
      return { data: this.wantSingle || this.wantMaybeSingle ? (inserted[0] ?? null) : inserted, error: null, count: null };
    }

    if (this.mode === "update") {
      const updated: Row[] = [];
      const nextRows = rows.map((row) => {
        if (this.filters.every((f) => f(row))) {
          const merged = { ...row, ...this.payload, updated_at: now };
          updated.push(merged);
          return merged;
        }
        return row;
      });
      store[this.table] = nextRows;
      return { data: this.wantSingle || this.wantMaybeSingle ? (updated[0] ?? null) : updated, error: null, count: null };
    }

    if (this.mode === "delete") {
      const remaining = rows.filter((row) => !this.filters.every((f) => f(row)));
      store[this.table] = remaining;
      return { data: null, error: null, count: null };
    }

    // select
    let filtered = rows.filter((row) => this.filters.every((f) => f(row)));
    if (this.orderCol) {
      const col = this.orderCol;
      filtered = [...filtered].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av == null && bv == null) return 0;
        if (av == null) return this.orderAsc ? -1 : 1;
        if (bv == null) return this.orderAsc ? 1 : -1;
        if (av < bv) return this.orderAsc ? -1 : 1;
        if (av > bv) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }
    if (this.limitN != null) filtered = filtered.slice(0, this.limitN);
    filtered = filtered.map((row) => resolveRowEmbeds(row, this.columnsStr));

    if (this.wantCount) {
      return { data: null, error: null, count: filtered.length };
    }
    if (this.wantSingle) {
      const row = filtered[0];
      return row
        ? { data: row, error: null, count: null }
        : { data: null, error: { message: "Registro não encontrado (mock)." }, count: null };
    }
    if (this.wantMaybeSingle) {
      return { data: filtered[0] ?? null, error: null, count: null };
    }

    return { data: filtered, error: null, count: null };
  }

  then<TResult1 = MockResult, TResult2 = never>(
    onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

function currentMockUser() {
  const admin = store.usuarios.find((u) => u.id === MOCK_ADMIN_ID)!;
  return { id: admin.id as string, email: admin.email as string };
}

function createMockAuth() {
  return {
    getUser: async () => ({ data: { user: currentMockUser() }, error: null }),
    signInWithPassword: async () => ({ data: { user: currentMockUser(), session: {} }, error: null }),
    signOut: async () => ({ error: null }),
    admin: {
      // Usado só por createAdminClient() (src/lib/supabase/admin.ts) pra
      // criar o login de um vendedor. Em mock mode não existe auth.users de
      // verdade — só devolve um id novo pra virar a PK de `usuarios`.
      createUser: async (_attrs: { email: string; password: string }) => ({
        data: { user: { id: nextId(), email: _attrs.email } },
        error: null,
      }),
      deleteUser: async () => ({ data: {}, error: null }),
    },
  };
}

export function createMockClient(): SupabaseClient<Database> {
  const client = {
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    auth: createMockAuth(),
  };

  return client as unknown as SupabaseClient<Database>;
}
