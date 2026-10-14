-- Acerto de comissões de vendedor: quando um lote de repasse é marcado como
-- "pago" (a Avantar já recebeu da seguradora/matriz), gera automaticamente
-- um "acerto" por vendedor com as linhas daquele lote que são dele — fica
-- parado como rascunho até o admin revisar e enviar pro vendedor confirmar
-- os totais a receber; só depois disso o admin marca o acerto como pago (o
-- pagamento em si continua manual, fora do sistema). Vendedor/produção sem
-- comissao_pct (ex. "Unidade", sem vendedor) não gera acerto.

create table public.comissoes_acertos (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.repasses_lotes (id) on delete cascade,
  vendedor_id uuid not null references public.usuarios (id) on delete cascade,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'enviado', 'confirmado', 'pago')),
  valor_total numeric(12, 2) not null default 0,
  enviado_em timestamptz,
  confirmado_em timestamptz,
  confirmado_por uuid references public.usuarios (id) on delete set null,
  pago_em timestamptz,
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lote_id, vendedor_id)
);

create trigger set_updated_at
  before update on public.comissoes_acertos
  for each row execute function public.set_updated_at();

-- Itens do acerto — um por repasse, com o valor de comissão "congelado" no
-- momento da geração (se comissao_pct da produção mudar depois, o acerto já
-- enviado/confirmado não deve mudar de valor por baixo do vendedor).
create table public.comissoes_acertos_itens (
  id uuid primary key default gen_random_uuid(),
  acerto_id uuid not null references public.comissoes_acertos (id) on delete cascade,
  repasse_id uuid not null unique references public.repasses (id) on delete cascade,
  comissao_bruta numeric(12, 2) not null,
  comissao_pct numeric(6, 3) not null,
  valor_comissao numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create or replace function public.gerar_acertos_comissao()
returns trigger
language plpgsql
as $$
declare
  novo_acerto_id uuid;
begin
  for novo_acerto_id in
    insert into public.comissoes_acertos (lote_id, vendedor_id, valor_total)
    select
      new.id,
      p.vendedor_id,
      round(sum(r.comissao_bruta * p.comissao_pct / 100), 2)
    from public.repasses r
    join public.producoes p on p.id = r.producao_id
    where r.lote_id = new.id
      and p.vendedor_id is not null
      and p.comissao_pct is not null
      and p.comissao_pct > 0
    group by p.vendedor_id
    returning id
  loop
    insert into public.comissoes_acertos_itens (acerto_id, repasse_id, comissao_bruta, comissao_pct, valor_comissao)
    select
      novo_acerto_id,
      r.id,
      r.comissao_bruta,
      p.comissao_pct,
      round(r.comissao_bruta * p.comissao_pct / 100, 2)
    from public.repasses r
    join public.producoes p on p.id = r.producao_id
    join public.comissoes_acertos ca on ca.id = novo_acerto_id
    where r.lote_id = new.id
      and p.vendedor_id = ca.vendedor_id
      and p.vendedor_id is not null
      and p.comissao_pct is not null
      and p.comissao_pct > 0;
  end loop;
  return new;
end;
$$;

create trigger gerar_acertos_comissao
  after update of status on public.repasses_lotes
  for each row
  when (new.status = 'pago' and old.status is distinct from 'pago')
  execute function public.gerar_acertos_comissao();

-- ============================================================
-- RLS — mesmo padrão admin full / vendedor só o que é dele do resto do
-- schema. O update do vendedor (confirmar) não trava a transição de status
-- por policy (como followups_vendedor_conclui, que também não trava campo) —
-- quem garante que só vai de 'enviado' pra 'confirmado' é a Server Action.
-- ============================================================
alter table public.comissoes_acertos enable row level security;
alter table public.comissoes_acertos_itens enable row level security;

create policy comissoes_acertos_admin_all on public.comissoes_acertos
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

create policy comissoes_acertos_vendedor_select on public.comissoes_acertos
  for select using (vendedor_id = auth.uid());

create policy comissoes_acertos_vendedor_confirma on public.comissoes_acertos
  for update using (vendedor_id = auth.uid()) with check (vendedor_id = auth.uid());

create policy comissoes_acertos_itens_admin_all on public.comissoes_acertos_itens
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());

create policy comissoes_acertos_itens_vendedor_select on public.comissoes_acertos_itens
  for select using (
    exists (
      select 1 from public.comissoes_acertos ca
      where ca.id = comissoes_acertos_itens.acerto_id and ca.vendedor_id = auth.uid()
    )
  );
