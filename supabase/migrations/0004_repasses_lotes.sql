-- Repasses passam a ser agrupados por lote (o relatório "PRP01 - Previsão
-- Repasses a pagar" importado de uma vez, ex. "01/09/2026 à 10/09/2026").
-- A Avantar recebe um pagamento único por relatório/período — uma NF, uma
-- data de pagamento, um valor — não um por linha/apólice como o schema
-- anterior modelava. O fluxo de status (aguardando_nf -> aguardando_pagamento
-- -> pago) migra da linha (`repasses`) pro lote (`repasses_lotes`).

create table public.repasses_lotes (
  id uuid primary key default gen_random_uuid(),
  arquivo text,
  periodo_inicio date not null,
  periodo_fim date not null,
  comissao_bruta_total numeric(12,2),
  status text not null default 'aguardando_nf' check (status in ('aguardando_nf', 'aguardando_pagamento', 'pago')),
  nf_info text,
  data_pagamento date,
  valor_pago numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (periodo_inicio, periodo_fim)
);

create trigger set_updated_at
  before update on public.repasses_lotes
  for each row execute function public.set_updated_at();

-- Backfill: a migration 0003 inseriu repasses reais no schema antigo (status
-- na própria linha, só "periodo" AAAA-MM, sem rastro de qual relatório
-- originou cada linha). Os limites de período abaixo (`legado_lotes`) batem
-- com as 15 NFS-e de fato emitidas pra esses repasses (nºs 1-4, 6-16, sem a
-- 5) — a reconciliação em si (status pago, número/competência da NF, data e
-- valor pagos) entra na migration 0007, que roda depois das colunas de NF
-- (migration 0005) existirem.
with legado_lotes (grupo, periodo_inicio, periodo_fim) as (
  values
    (1,  '2026-01-01'::date, '2026-01-15'::date),
    (2,  '2026-02-01'::date, '2026-02-13'::date),
    (3,  '2026-02-14'::date, '2026-02-28'::date),
    (4,  '2026-03-01'::date, '2026-03-30'::date),
    (5,  '2026-04-01'::date, '2026-04-30'::date),
    (6,  '2026-05-01'::date, '2026-05-08'::date),
    (7,  '2026-05-09'::date, '2026-05-20'::date),
    (8,  '2026-05-21'::date, '2026-05-28'::date),
    (9,  '2026-06-01'::date, '2026-06-10'::date),
    (10, '2026-06-11'::date, '2026-06-16'::date),
    (11, '2026-06-17'::date, '2026-06-22'::date),
    (12, '2026-07-01'::date, '2026-07-30'::date),
    (13, '2026-08-01'::date, '2026-08-07'::date),
    (14, '2026-08-08'::date, '2026-08-20'::date),
    (15, '2026-09-01'::date, '2026-09-10'::date)
),
legado_linhas (grupo, producao_id, parcela) as (
  values
    (1,  '50000000-0000-4000-8000-000000000001'::uuid, '1/10'),
    (2,  '50000000-0000-4000-8000-000000000002'::uuid, '1/10'),
    (3,  '50000000-0000-4000-8000-000000000001'::uuid, '2/10'),
    (3,  '50000000-0000-4000-8000-000000000003'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000004'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000005'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000006'::uuid, '1/12'),
    (4,  '50000000-0000-4000-8000-000000000003'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000004'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000005'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000006'::uuid, '2/12'),
    (5,  '50000000-0000-4000-8000-000000000005'::uuid, '3/12'),
    (5,  '50000000-0000-4000-8000-000000000006'::uuid, '3/12'),
    (6,  '50000000-0000-4000-8000-000000000003'::uuid, '3/12'),
    (6,  '50000000-0000-4000-8000-000000000004'::uuid, '3/12'),
    (7,  '50000000-0000-4000-8000-000000000007'::uuid, '1/12'),
    (7,  '50000000-0000-4000-8000-000000000008'::uuid, '1/12'),
    (7,  '50000000-0000-4000-8000-000000000009'::uuid, '1/10'),
    (8,  '50000000-0000-4000-8000-000000000005'::uuid, '4/12'),
    (8,  '50000000-0000-4000-8000-000000000006'::uuid, '4/12'),
    (8,  '50000000-0000-4000-8000-000000000010'::uuid, '1/1'),
    (9,  '50000000-0000-4000-8000-000000000003'::uuid, '4/12'),
    (9,  '50000000-0000-4000-8000-000000000004'::uuid, '4/12'),
    (10, '50000000-0000-4000-8000-000000000003'::uuid, '5/12'),
    (10, '50000000-0000-4000-8000-000000000004'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000005'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000006'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000009'::uuid, '2/10'),
    (11, '50000000-0000-4000-8000-000000000021'::uuid, '1/10'),
    (12, '50000000-0000-4000-8000-000000000003'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000004'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000005'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000006'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000009'::uuid, '3/10'),
    (12, '50000000-0000-4000-8000-000000000011'::uuid, '1/3'),
    (13, '50000000-0000-4000-8000-000000000017'::uuid, '1/12'),
    (13, '50000000-0000-4000-8000-000000000018'::uuid, '1/12'),
    (13, '50000000-0000-4000-8000-000000000019'::uuid, '1/6'),
    (13, '50000000-0000-4000-8000-000000000020'::uuid, '1/10'),
    (14, '50000000-0000-4000-8000-000000000014'::uuid, '1/1'),
    (14, '50000000-0000-4000-8000-000000000015'::uuid, '1/1'),
    (14, '50000000-0000-4000-8000-000000000016'::uuid, '1/10'),
    (15, '50000000-0000-4000-8000-000000000003'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000004'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000005'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000006'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000012'::uuid, '1/12'),
    (15, '50000000-0000-4000-8000-000000000013'::uuid, '1/12'),
    (15, '50000000-0000-4000-8000-000000000017'::uuid, '2/12'),
    (15, '50000000-0000-4000-8000-000000000018'::uuid, '2/12')
)
insert into public.repasses_lotes (arquivo, periodo_inicio, periodo_fim, comissao_bruta_total, status)
select
  'legado-' || ll.periodo_inicio || '.pdf',
  ll.periodo_inicio,
  ll.periodo_fim,
  sum(r.comissao_bruta),
  'aguardando_nf'
from legado_lotes ll
join legado_linhas li on li.grupo = ll.grupo
join public.repasses r on r.producao_id = li.producao_id and r.parcela = li.parcela
group by ll.periodo_inicio, ll.periodo_fim
on conflict (periodo_inicio, periodo_fim) do nothing;

alter table public.repasses add column lote_id uuid references public.repasses_lotes (id) on delete cascade;

with legado_lotes (grupo, periodo_inicio, periodo_fim) as (
  values
    (1,  '2026-01-01'::date, '2026-01-15'::date),
    (2,  '2026-02-01'::date, '2026-02-13'::date),
    (3,  '2026-02-14'::date, '2026-02-28'::date),
    (4,  '2026-03-01'::date, '2026-03-30'::date),
    (5,  '2026-04-01'::date, '2026-04-30'::date),
    (6,  '2026-05-01'::date, '2026-05-08'::date),
    (7,  '2026-05-09'::date, '2026-05-20'::date),
    (8,  '2026-05-21'::date, '2026-05-28'::date),
    (9,  '2026-06-01'::date, '2026-06-10'::date),
    (10, '2026-06-11'::date, '2026-06-16'::date),
    (11, '2026-06-17'::date, '2026-06-22'::date),
    (12, '2026-07-01'::date, '2026-07-30'::date),
    (13, '2026-08-01'::date, '2026-08-07'::date),
    (14, '2026-08-08'::date, '2026-08-20'::date),
    (15, '2026-09-01'::date, '2026-09-10'::date)
),
legado_linhas (grupo, producao_id, parcela) as (
  values
    (1,  '50000000-0000-4000-8000-000000000001'::uuid, '1/10'),
    (2,  '50000000-0000-4000-8000-000000000002'::uuid, '1/10'),
    (3,  '50000000-0000-4000-8000-000000000001'::uuid, '2/10'),
    (3,  '50000000-0000-4000-8000-000000000003'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000004'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000005'::uuid, '1/12'),
    (3,  '50000000-0000-4000-8000-000000000006'::uuid, '1/12'),
    (4,  '50000000-0000-4000-8000-000000000003'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000004'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000005'::uuid, '2/12'),
    (4,  '50000000-0000-4000-8000-000000000006'::uuid, '2/12'),
    (5,  '50000000-0000-4000-8000-000000000005'::uuid, '3/12'),
    (5,  '50000000-0000-4000-8000-000000000006'::uuid, '3/12'),
    (6,  '50000000-0000-4000-8000-000000000003'::uuid, '3/12'),
    (6,  '50000000-0000-4000-8000-000000000004'::uuid, '3/12'),
    (7,  '50000000-0000-4000-8000-000000000007'::uuid, '1/12'),
    (7,  '50000000-0000-4000-8000-000000000008'::uuid, '1/12'),
    (7,  '50000000-0000-4000-8000-000000000009'::uuid, '1/10'),
    (8,  '50000000-0000-4000-8000-000000000005'::uuid, '4/12'),
    (8,  '50000000-0000-4000-8000-000000000006'::uuid, '4/12'),
    (8,  '50000000-0000-4000-8000-000000000010'::uuid, '1/1'),
    (9,  '50000000-0000-4000-8000-000000000003'::uuid, '4/12'),
    (9,  '50000000-0000-4000-8000-000000000004'::uuid, '4/12'),
    (10, '50000000-0000-4000-8000-000000000003'::uuid, '5/12'),
    (10, '50000000-0000-4000-8000-000000000004'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000005'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000006'::uuid, '5/12'),
    (11, '50000000-0000-4000-8000-000000000009'::uuid, '2/10'),
    (11, '50000000-0000-4000-8000-000000000021'::uuid, '1/10'),
    (12, '50000000-0000-4000-8000-000000000003'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000004'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000005'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000006'::uuid, '6/12'),
    (12, '50000000-0000-4000-8000-000000000009'::uuid, '3/10'),
    (12, '50000000-0000-4000-8000-000000000011'::uuid, '1/3'),
    (13, '50000000-0000-4000-8000-000000000017'::uuid, '1/12'),
    (13, '50000000-0000-4000-8000-000000000018'::uuid, '1/12'),
    (13, '50000000-0000-4000-8000-000000000019'::uuid, '1/6'),
    (13, '50000000-0000-4000-8000-000000000020'::uuid, '1/10'),
    (14, '50000000-0000-4000-8000-000000000014'::uuid, '1/1'),
    (14, '50000000-0000-4000-8000-000000000015'::uuid, '1/1'),
    (14, '50000000-0000-4000-8000-000000000016'::uuid, '1/10'),
    (15, '50000000-0000-4000-8000-000000000003'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000004'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000005'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000006'::uuid, '7/12'),
    (15, '50000000-0000-4000-8000-000000000012'::uuid, '1/12'),
    (15, '50000000-0000-4000-8000-000000000013'::uuid, '1/12'),
    (15, '50000000-0000-4000-8000-000000000017'::uuid, '2/12'),
    (15, '50000000-0000-4000-8000-000000000018'::uuid, '2/12')
)
update public.repasses r
set lote_id = l.id
from legado_linhas li
join legado_lotes ll on ll.grupo = li.grupo
join public.repasses_lotes l on l.periodo_inicio = ll.periodo_inicio and l.periodo_fim = ll.periodo_fim
where r.producao_id = li.producao_id and r.parcela = li.parcela;

alter table public.repasses alter column lote_id set not null;
alter table public.repasses drop column status;
alter table public.repasses drop column nf_info;
alter table public.repasses drop column data_pagamento;
alter table public.repasses drop column valor_pago;

alter table public.repasses_lotes enable row level security;

create policy repasses_lotes_admin_all on public.repasses_lotes
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

create policy repasses_lotes_vendedor_select on public.repasses_lotes
  for select using (
    exists (
      select 1 from public.repasses r
      join public.producoes p on p.id = r.producao_id
      where r.lote_id = repasses_lotes.id and p.vendedor_id = auth.uid()
    )
  );
