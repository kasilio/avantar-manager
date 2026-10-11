-- Emissão de NFS-e real via Ambiente Nacional (Sefin Nacional). Uma linha
-- por TENTATIVA de emissão (rascunho até resultado final) — uma rejeição ou
-- erro nunca vira um novo rascunho reaproveitando o número; gera-se uma
-- linha nova, mantendo trilha de auditoria completa de tudo que já foi
-- assinado/transmitido com o certificado da empresa. Valor e competência são
-- sempre informados manualmente (não há cálculo automático a partir de
-- repasses) e a transmissão real exige confirmação explícita do usuário —
-- ver src/app/(dashboard)/financeiro/nfse/actions.ts.
create table public.nfse_emissoes (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  valor numeric(12, 2) not null check (valor > 0),
  serie_dps text not null default '70000',
  numero_dps integer not null,
  -- Snapshot do ambiente usado nesta tentativa (NFSE_AMBIENTE no momento da
  -- criação) — nunca re-derivar do env atual, pra linha antiga não mudar de
  -- rótulo se o toggle for alterado depois.
  ambiente text not null check (ambiente in ('restrita', 'producao')),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'assinado', 'enviando', 'autorizado', 'rejeitado', 'erro')),
  dps_xml text,
  dps_xml_assinado text,
  chave_acesso text,
  numero_nfse text,
  nfse_xml text,
  -- Motivo que o governo deu pra rejeição, distinto de erro_detalhe (falha
  -- do nosso lado: rede, timeout, assinatura).
  motivo_rejeicao text,
  erro_detalhe text,
  payload_enviado jsonb,
  payload_resposta jsonb,
  criado_por uuid references public.usuarios (id) on delete set null,
  -- Preenchido só dentro da action transmitir() — é a evidência de que o
  -- clique de confirmação na tela de revisão realmente aconteceu antes de
  -- qualquer envio ao governo.
  confirmado_por uuid references public.usuarios (id) on delete set null,
  confirmado_em timestamptz,
  transmitido_em timestamptz,
  autorizado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index nfse_emissoes_serie_numero_idx
  on public.nfse_emissoes (serie_dps, numero_dps);
create index nfse_emissoes_competencia_idx on public.nfse_emissoes (competencia);
create index nfse_emissoes_status_idx on public.nfse_emissoes (status);
create unique index nfse_emissoes_chave_acesso_idx
  on public.nfse_emissoes (chave_acesso) where chave_acesso is not null;
create unique index nfse_emissoes_numero_nfse_idx
  on public.nfse_emissoes (numero_nfse) where numero_nfse is not null;

create trigger set_updated_at
  before update on public.nfse_emissoes
  for each row execute function public.set_updated_at();

-- Seed da NFS-e nº16, já emitida manualmente pelo portal antes deste
-- sistema existir (ver Contador/NFS/dados-fixos.json) — sem XML/payload
-- porque não passou por aqui. Existe só pra numero_dps continuar a
-- sequência real (próxima emissão calcula MAX(numero_dps)+1 = 18) em vez de
-- recomeçar do zero.
insert into public.nfse_emissoes
  (competencia, valor, serie_dps, numero_dps, ambiente, status, numero_nfse, autorizado_em)
values
  ('2026-09-10', 4569.42, '70000', 17, 'producao', 'autorizado', '16', '2026-09-10T00:00:00Z');

-- RLS — admin-only pra leitura e escrita (mais restrito que
-- fechamentos_mensais, que é leitura-geral): esta tabela guarda XML
-- assinado e payloads de uma transação fiscal real: nenhuma feature de
-- vendedor precisa dela.
alter table public.nfse_emissoes enable row level security;

create policy nfse_emissoes_admin_all on public.nfse_emissoes
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
