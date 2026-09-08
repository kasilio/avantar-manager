// Client "mock" usado só quando não há projeto Supabase configurado ainda
// (ver IS_MOCK_MODE em ./is-mock-mode.ts). Implementa, em memória, o
// subconjunto da API do supabase-js que o app usa (from/select/eq/neq/is/in/
// gte/lte/order/limit/single/maybeSingle/insert/update/delete + auth.getUser/
// signInWithPassword/signOut), com os mesmos seeds de cadastro da migration
// (supabase/migrations/0001_core.sql), pra dar pra navegar e estruturar as
// telas sem depender de um backend real. Assim que `.env.local` tiver
// credenciais reais, IS_MOCK_MODE vira false e este arquivo deixa de ser
// usado — nenhum outro código muda.
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MOCK_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const MOCK_VENDEDOR_ID = "00000000-0000-4000-8000-000000000002";

type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;

function iso(date: Date) {
  return date.toISOString();
}
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function seedStore(): Store {
  const now = new Date();

  const clienteDemoId = "40000000-0000-4000-8000-000000000001";
  const producaoDemoId = "50000000-0000-4000-8000-000000000001";
  const tipoTrId = "20000000-0000-4000-8000-000000000001";
  const seguradoraDemoId = "30000000-0000-4000-8000-000000000001";

  return {
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
      { id: tipoTrId, nome: "TRANSPORTE-TR", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000002", nome: "FROTA", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000003", nome: "AUTOMÓVEL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000004", nome: "VIDA MOTORISTA", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000005", nome: "PATRIMONIAL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000006", nome: "RC GERAL", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "20000000-0000-4000-8000-000000000007", nome: "OUTRO", descricao: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
    ],
    seguradoras: [
      { id: seguradoraDemoId, nome: "Porto Seguro", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000002", nome: "HDI Seguros", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
      { id: "30000000-0000-4000-8000-000000000003", nome: "Allianz", susep: null, cnpj: null, telefone: null, site: null, obs: null, bloqueada: true, created_at: iso(now), updated_at: iso(now) },
    ],
    crm_colunas: [
      { id: "novo", label: "Novo Lead", icon: "🆕", color: "var(--blue)", sistema: true, bloqueada: true, nota: null, ordem: 1 },
      { id: "contato", label: "Em Contato", icon: "💬", color: "var(--gold)", sistema: true, bloqueada: true, nota: null, ordem: 2 },
      { id: "proposta", label: "Proposta", icon: "📄", color: "var(--amber)", sistema: true, bloqueada: true, nota: null, ordem: 3 },
      { id: "fechado", label: "Fechado", icon: "✅", color: "var(--green)", sistema: true, bloqueada: true, nota: null, ordem: 4 },
      { id: "perdido", label: "Perdido", icon: "❌", color: "var(--red)", sistema: true, bloqueada: true, nota: null, ordem: 5 },
      { id: "followup", label: "Follow-up", icon: "🔁", color: "var(--purple)", sistema: true, bloqueada: true, nota: "Reagendado automaticamente 2 meses após \"Perdido\"", ordem: 6 },
    ],
    clientes: [
      {
        id: clienteDemoId,
        tipo_doc: "cnpj",
        nome: "Transportes Alfa Ltda",
        fantasia: "Alfa Log",
        cnpj: "11222333000181",
        cpf: null,
        nascimento: null,
        situacao: "ATIVA",
        cep: "01310-100",
        logradouro: "Av. Paulista",
        numero: "1000",
        bairro: "Bela Vista",
        cidade: "São Paulo/SP",
        cnae: null,
        porte: null,
        tel: "(11) 3333-0000",
        email_com: "contato@alfalog.com.br",
        status: "ativo",
        obs: null,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    clientes_contatos: [
      {
        id: "41000000-0000-4000-8000-000000000001",
        cliente_id: clienteDemoId,
        nome: "Carlos Souza",
        cargo: "Diretor",
        whatsapp: "(11) 99999-0001",
        email: "carlos@alfalog.com.br",
        aniversario: isoDate(new Date(1985, (now.getMonth() + 1) % 12, 15)),
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    producoes: [
      {
        id: producaoDemoId,
        cliente_id: clienteDemoId,
        tipo_produto_id: tipoTrId,
        seguradora_id: seguradoraDemoId,
        num_apolice: "AP-000123",
        num_proposta: "PR-000123",
        premio_mensal: 4200,
        premio_total: 50400,
        comissao_bruta_pct: 15,
        comissao_avantar_pct: 5.25,
        comissao_unidade_pct: 9.75,
        parcelas: "12x",
        vigencia_inicio: isoDate(addDays(now, -60)),
        vigencia_fim: isoDate(addDays(now, 305)),
        data_renovacao: isoDate(addDays(now, 275)),
        status_manual: "ativa",
        vendedor_id: MOCK_VENDEDOR_ID,
        comissao_pct: 20,
        obs: null,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    followups: [
      { id: "60000000-0000-4000-8000-000000000001", producao_id: producaoDemoId, dias: 7, motivo: "Pedir indicação", due_date: isoDate(addDays(now, -53)), concluido_em: isoDate(addDays(now, -50)), created_at: iso(now) },
      { id: "60000000-0000-4000-8000-000000000002", producao_id: producaoDemoId, dias: 30, motivo: "Verificar necessidades", due_date: isoDate(addDays(now, -30)), concluido_em: null, created_at: iso(now) },
      { id: "60000000-0000-4000-8000-000000000003", producao_id: producaoDemoId, dias: 90, motivo: "Oferecer outro produto", due_date: isoDate(addDays(now, 30)), concluido_em: null, created_at: iso(now) },
    ],
    repasses: [
      {
        id: "70000000-0000-4000-8000-000000000001",
        producao_id: producaoDemoId,
        parcela: "1/12",
        periodo: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        comissao_bruta: 630,
        apolice_pct: 15,
        repasse_pct: 9.75,
        status: "aguardando_pagamento",
        nf_info: "NF-9001",
        data_pagamento: null,
        valor_pago: null,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    prospeccoes: [
      {
        id: "80000000-0000-4000-8000-000000000001",
        empresa: "Comércio Beta S.A.",
        cliente_id: null,
        tipo_produto_id: tipoTrId,
        coluna_id: "contato",
        next_contact: isoDate(addDays(now, 3)),
        obs: null,
        vendedor_id: MOCK_VENDEDOR_ID,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    tarefas: [
      {
        id: "90000000-0000-4000-8000-000000000001",
        titulo: "Ligar pra confirmar renovação",
        data: isoDate(now),
        descricao: null,
        concluida: false,
        vendedor_id: null,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    despesas: [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        tipo: "fixa",
        descricao: "Sistema de gestão",
        valor: 199,
        categoria: "Software",
        dia_vencimento: 10,
        data: null,
        ativa: true,
        created_at: iso(now),
        updated_at: iso(now),
      },
    ],
    despesas_pagamentos: [],
    settings: [{ id: true, aliquota_simples: 6, meta_mensal: 15000, updated_at: iso(now) }],
  };
}

const globalForMock = globalThis as unknown as { __avantarMockStore?: Store };
const store = globalForMock.__avantarMockStore ?? (globalForMock.__avantarMockStore = seedStore());

function nextId() {
  return crypto.randomUUID();
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

  constructor(private table: string) {}

  select(_columns?: string, opts?: { count?: string; head?: boolean }) {
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
      const inserted = items.map((item) => ({
        id: nextId(),
        created_at: now,
        updated_at: now,
        ...item,
      }));
      rows.push(...inserted);
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
