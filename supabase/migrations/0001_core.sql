-- Avantar Manager — schema Fase 1: usuarios (admin/vendedor), cadastros,
-- clientes, produções, follow-ups, repasses, CRM (kanban), tarefas,
-- financeiro (despesas/DRE). Single-tenant (só a Avantar usa esta instância
-- — sem tabela `tenants`, diferente do ERP-TRANSPORTADORA multi-tenant).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- usuarios (id = auth.users.id; senha fica no Supabase Auth, não aqui)
-- Unifica login + cadastro de vendedor/assessor (campos susep/pix/cpf
-- só fazem sentido pra papel='vendedor', mas ficam na mesma tabela pra
-- não duplicar a conta de auth).
-- ============================================================
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  papel text not null check (papel in ('admin', 'vendedor')),
  cpf text,
  susep text,
  whatsapp text,
  pix text,
  obs text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.usuarios
  for each row execute function public.set_updated_at();

-- Função de apoio pra RLS (security definer evita recursão de policy ao
-- consultar a própria tabela usuarios) — mesmo padrão do ERP-TRANSPORTADORA.
create or replace function public.auth_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select papel from public.usuarios where id = auth.uid();
$$;

create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios where id = auth.uid() and papel = 'admin'
  );
$$;

-- ============================================================
-- tipos_produto / seguradoras — cadastros de apoio. `bloqueada` marca os
-- itens padrão (seed abaixo) que não podem ser removidos pela UI.
-- ============================================================
create table public.tipos_produto (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  bloqueada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.tipos_produto
  for each row execute function public.set_updated_at();

create table public.seguradoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  susep text,
  cnpj text,
  telefone text,
  site text,
  obs text,
  bloqueada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.seguradoras
  for each row execute function public.set_updated_at();

-- ============================================================
-- clientes + contatos (contatos normalizado em tabela própria — no HTML
-- antigo era um array embutido no cliente).
-- ============================================================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  tipo_doc text not null default 'cnpj' check (tipo_doc in ('cnpj', 'cpf')),
  nome text not null,
  fantasia text,
  cnpj text,
  cpf text,
  nascimento date,
  situacao text,
  cep text,
  logradouro text,
  numero text,
  bairro text,
  cidade text,
  cnae text,
  porte text,
  tel text,
  email_com text,
  status text not null default 'prospect' check (status in ('prospect', 'ativo', 'inativo')),
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

create table public.clientes_contatos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  cargo text,
  whatsapp text,
  email text,
  aniversario date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.clientes_contatos
  for each row execute function public.set_updated_at();

-- ============================================================
-- producoes — split de comissão 35% Avantar / 65% Unidade calculado por
-- trigger a partir de comissao_bruta_pct (mesma regra do HTML antigo).
-- vendedor_id nulo = "Unidade (sem vendedor)".
-- ============================================================
create table public.producoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  tipo_produto_id uuid references public.tipos_produto (id) on delete set null,
  seguradora_id uuid references public.seguradoras (id) on delete set null,
  num_apolice text,
  num_proposta text,
  premio_mensal numeric(12, 2),
  premio_total numeric(12, 2),
  comissao_bruta_pct numeric(6, 3),
  comissao_avantar_pct numeric(6, 3),
  comissao_unidade_pct numeric(6, 3),
  parcelas text,
  vigencia_inicio date,
  vigencia_fim date,
  data_renovacao date,
  status_manual text not null default 'ativa'
    check (status_manual in ('ativa', 'vencida', 'cancelada')),
  vendedor_id uuid references public.usuarios (id) on delete set null,
  comissao_pct numeric(6, 3),
  obs text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.calc_split_comissao()
returns trigger
language plpgsql
as $$
begin
  if new.comissao_bruta_pct is not null then
    new.comissao_avantar_pct := round(new.comissao_bruta_pct * 0.35, 3);
    new.comissao_unidade_pct := round(new.comissao_bruta_pct * 0.65, 3);
  else
    new.comissao_avantar_pct := null;
    new.comissao_unidade_pct := null;
  end if;
  return new;
end;
$$;

create trigger calc_split_comissao
  before insert or update of comissao_bruta_pct on public.producoes
  for each row execute function public.calc_split_comissao();

create trigger set_updated_at
  before update on public.producoes
  for each row execute function public.set_updated_at();

-- Auto-upgrade do cliente pra "ativo" quando ganha uma produção não cancelada
-- (mesma automação do HTML antigo: saveProducao -> auto-seta status do cliente).
create or replace function public.auto_ativar_cliente()
returns trigger
language plpgsql
as $$
begin
  if new.status_manual <> 'cancelada' then
    update public.clientes
      set status = 'ativo'
      where id = new.cliente_id and status <> 'inativo' and status <> 'ativo';
  end if;
  return new;
end;
$$;

create trigger auto_ativar_cliente
  after insert or update of status_manual on public.producoes
  for each row execute function public.auto_ativar_cliente();

-- ============================================================
-- followups — gerados automaticamente ao inserir uma produção
-- (cronograma 7/30/90/180/270/330 dias contados da vigência de início).
-- ============================================================
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null references public.producoes (id) on delete cascade,
  dias int not null,
  motivo text not null,
  due_date date not null,
  concluido_em date,
  created_at timestamptz not null default now()
);

create or replace function public.gerar_followups()
returns trigger
language plpgsql
as $$
declare
  base date := coalesce(new.vigencia_inicio, current_date);
begin
  insert into public.followups (producao_id, dias, motivo, due_date) values
    (new.id, 7,   'Pedir indicação',                base + 7),
    (new.id, 30,  'Verificar necessidades',          base + 30),
    (new.id, 90,  'Oferecer outro produto',          base + 90),
    (new.id, 180, 'Verificar necessidades (6m)',     base + 180),
    (new.id, 270, 'Verificar necessidades (9m)',     base + 270),
    (new.id, 330, 'Falar sobre renovação',           base + 330);
  return new;
end;
$$;

create trigger gerar_followups
  after insert on public.producoes
  for each row execute function public.gerar_followups();

-- ============================================================
-- repasses — vinculados a uma produção, workflow de status.
-- ============================================================
create table public.repasses (
  id uuid primary key default gen_random_uuid(),
  producao_id uuid not null references public.producoes (id) on delete cascade,
  parcela text,
  periodo text not null,
  comissao_bruta numeric(12, 2),
  apolice_pct numeric(6, 3),
  repasse_pct numeric(6, 3),
  status text not null default 'aguardando_nf'
    check (status in ('aguardando_nf', 'aguardando_pagamento', 'pago')),
  nf_info text,
  data_pagamento date,
  valor_pago numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.repasses
  for each row execute function public.set_updated_at();

-- ============================================================
-- CRM: colunas do kanban (configuráveis) + prospecções
-- ============================================================
create table public.crm_colunas (
  id text primary key,
  label text not null,
  icon text,
  color text,
  sistema boolean not null default false,
  bloqueada boolean not null default false,
  nota text,
  ordem int not null default 0
);

create table public.prospeccoes (
  id uuid primary key default gen_random_uuid(),
  empresa text not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  tipo_produto_id uuid references public.tipos_produto (id) on delete set null,
  coluna_id text not null references public.crm_colunas (id),
  next_contact date,
  obs text,
  vendedor_id uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.prospeccoes
  for each row execute function public.set_updated_at();

-- Automação: mover pra "Perdido" agenda um follow-up em +2 meses, que quando
-- atingido devolve o card pra coluna "Follow-up" (mesma regra do HTML antigo
-- — lá era um cron client-side em verificarFollowupsPerdidos(); aqui vira
-- trigger + a leitura da lista de prospecções recalcula/move quem já venceu).
create or replace function public.perdido_agenda_followup()
returns trigger
language plpgsql
as $$
begin
  if new.coluna_id = 'perdido' and (old.coluna_id is distinct from 'perdido') then
    new.next_contact := current_date + interval '2 months';
  end if;
  return new;
end;
$$;

create trigger perdido_agenda_followup
  before update of coluna_id on public.prospeccoes
  for each row execute function public.perdido_agenda_followup();

-- ============================================================
-- tarefas — só as manuais viram linha real; followups, vencimento de
-- despesa e aniversário continuam calculados em query (view abaixo).
-- ============================================================
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  descricao text,
  concluida boolean not null default false,
  vendedor_id uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.tarefas
  for each row execute function public.set_updated_at();

-- ============================================================
-- Financeiro: despesas fixas/variáveis + pagamentos por período + settings.
-- ============================================================
create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('fixa', 'variavel')),
  descricao text not null,
  valor numeric(12, 2) not null,
  categoria text,
  dia_vencimento int,
  data date,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.despesas
  for each row execute function public.set_updated_at();

create table public.despesas_pagamentos (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references public.despesas (id) on delete cascade,
  periodo text not null,
  data_pagamento date not null,
  created_at timestamptz not null default now(),
  unique (despesa_id, periodo)
);

create table public.settings (
  id boolean primary key default true check (id),
  aliquota_simples numeric(5, 2) not null default 6,
  meta_mensal numeric(12, 2) not null default 15000,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.usuarios enable row level security;
alter table public.tipos_produto enable row level security;
alter table public.seguradoras enable row level security;
alter table public.clientes enable row level security;
alter table public.clientes_contatos enable row level security;
alter table public.producoes enable row level security;
alter table public.followups enable row level security;
alter table public.repasses enable row level security;
alter table public.crm_colunas enable row level security;
alter table public.prospeccoes enable row level security;
alter table public.tarefas enable row level security;
alter table public.despesas enable row level security;
alter table public.despesas_pagamentos enable row level security;
alter table public.settings enable row level security;

-- usuarios: cada um vê/edita o próprio registro; admin vê e gerencia todos.
create policy usuarios_select on public.usuarios
  for select
  using (id = auth.uid() or public.auth_is_admin());

create policy usuarios_update_self on public.usuarios
  for update
  using (id = auth.uid() or public.auth_is_admin())
  with check (id = auth.uid() or public.auth_is_admin());

create policy usuarios_admin_insert on public.usuarios
  for insert
  with check (public.auth_is_admin());

create policy usuarios_admin_delete on public.usuarios
  for delete
  using (public.auth_is_admin());

-- Cadastros de apoio: leitura pra qualquer autenticado, escrita só admin.
create policy tipos_produto_select on public.tipos_produto
  for select using (auth.uid() is not null);
create policy tipos_produto_admin_write on public.tipos_produto
  for insert with check (public.auth_is_admin());
create policy tipos_produto_admin_update on public.tipos_produto
  for update using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy tipos_produto_admin_delete on public.tipos_produto
  for delete using (public.auth_is_admin());

create policy seguradoras_select on public.seguradoras
  for select using (auth.uid() is not null);
create policy seguradoras_admin_write on public.seguradoras
  for insert with check (public.auth_is_admin());
create policy seguradoras_admin_update on public.seguradoras
  for update using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy seguradoras_admin_delete on public.seguradoras
  for delete using (public.auth_is_admin());

create policy crm_colunas_select on public.crm_colunas
  for select using (auth.uid() is not null);
create policy crm_colunas_admin_write on public.crm_colunas
  for insert with check (public.auth_is_admin());
create policy crm_colunas_admin_update on public.crm_colunas
  for update using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy crm_colunas_admin_delete on public.crm_colunas
  for delete using (public.auth_is_admin());

-- clientes: admin full; vendedor só enxerga (leitura) clientes com alguma
-- produção dele vinculada — carteira própria, não a carteira toda.
create policy clientes_admin_all on public.clientes
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy clientes_vendedor_select on public.clientes
  for select using (
    exists (
      select 1 from public.producoes p
      where p.cliente_id = clientes.id and p.vendedor_id = auth.uid()
    )
  );

create policy clientes_contatos_admin_all on public.clientes_contatos
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy clientes_contatos_vendedor_select on public.clientes_contatos
  for select using (
    exists (
      select 1 from public.producoes p
      where p.cliente_id = clientes_contatos.cliente_id and p.vendedor_id = auth.uid()
    )
  );

-- producoes / followups / repasses: admin full; vendedor só leitura das
-- próprias (comissão é dele, mas quem edita valores é o admin).
create policy producoes_admin_all on public.producoes
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy producoes_vendedor_select on public.producoes
  for select using (vendedor_id = auth.uid());

create policy followups_admin_all on public.followups
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy followups_vendedor_select on public.followups
  for select using (
    exists (
      select 1 from public.producoes p
      where p.id = followups.producao_id and p.vendedor_id = auth.uid()
    )
  );
create policy followups_vendedor_conclui on public.followups
  for update using (
    exists (
      select 1 from public.producoes p
      where p.id = followups.producao_id and p.vendedor_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.producoes p
      where p.id = followups.producao_id and p.vendedor_id = auth.uid()
    )
  );

create policy repasses_admin_all on public.repasses
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy repasses_vendedor_select on public.repasses
  for select using (
    exists (
      select 1 from public.producoes p
      where p.id = repasses.producao_id and p.vendedor_id = auth.uid()
    )
  );

-- prospeccoes / tarefas: cada vendedor gerencia as próprias; admin gerencia tudo.
create policy prospeccoes_admin_all on public.prospeccoes
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy prospeccoes_vendedor_own on public.prospeccoes
  for all using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

create policy tarefas_admin_all on public.tarefas
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy tarefas_vendedor_own on public.tarefas
  for all using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

-- Financeiro (despesas/DRE/settings): só admin — informação da empresa,
-- vendedor não precisa e não deve ver.
create policy despesas_admin_only on public.despesas
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy despesas_pagamentos_admin_only on public.despesas_pagamentos
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy settings_admin_only on public.settings
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

-- ============================================================
-- Seed: cadastros "bloqueados" (mesma lista padrão do HTML antigo) +
-- colunas fixas do kanban + linha única de settings.
-- ============================================================
insert into public.tipos_produto (nome, bloqueada) values
  ('TRANSPORTE-TR', true),
  ('FROTA', true),
  ('AUTOMÓVEL', true),
  ('VIDA MOTORISTA', true),
  ('PATRIMONIAL', true),
  ('RC GERAL', true),
  ('OUTRO', true);

insert into public.seguradoras (nome, bloqueada) values
  ('Porto Seguro', true),
  ('HDI Seguros', true),
  ('Allianz', true),
  ('Bradesco Seguros', true),
  ('Tokio Marine', true),
  ('Sompo Seguros', true),
  ('Mapfre', true),
  ('Suhai Seguradora', true),
  ('Zurich', true),
  ('Sura', true),
  ('Itaú Seguros', true),
  ('Sancor Seguros', true),
  ('Pottencial Seguradora', true);

insert into public.crm_colunas (id, label, icon, color, sistema, bloqueada, nota, ordem) values
  ('novo',      'Novo Lead',    '🆕', 'var(--blue)',   true, true,  null, 1),
  ('contato',   'Em Contato',   '💬', 'var(--gold)',   true, true,  null, 2),
  ('proposta',  'Proposta',     '📄', 'var(--amber)',  true, true,  null, 3),
  ('fechado',   'Fechado',      '✅', 'var(--green)',  true, true,  null, 4),
  ('perdido',   'Perdido',      '❌', 'var(--red)',    true, true,  null, 5),
  ('followup',  'Follow-up',    '🔁', 'var(--purple)', true, true,  'Reagendado automaticamente 2 meses após "Perdido"', 6);

insert into public.settings (id) values (true);
