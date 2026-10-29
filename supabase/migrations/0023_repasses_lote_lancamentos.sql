-- O relatório "PRP01 - Previsão Repasses a pagar" traz uma segunda caixa,
-- "Outros Lançamentos", com créditos/débitos avulsos do lote que não têm
-- apólice/produção associada (ex. desconto de uma apólice de outro ramo
-- lançado na comissão do produtor). Esse valor soma no "Créd./Déb." do
-- cabeçalho do relatório e, junto com a Comissão Bruta, fecha a Comissão
-- Líquida — mas não é base de comissão de serviço (não entra na NF, que usa
-- só `repasses_lotes.comissao_bruta_total`), por isso fica numa tabela à
-- parte, não misturado com `repasses`.

create table public.repasses_lote_lancamentos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.repasses_lotes (id) on delete cascade,
  credito_debito_id text not null,
  data date,
  documento text not null,
  descricao text not null,
  corretora text,
  valor numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (lote_id, credito_debito_id)
);

alter table public.repasses_lote_lancamentos enable row level security;

create policy repasses_lote_lancamentos_admin_all on public.repasses_lote_lancamentos
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
