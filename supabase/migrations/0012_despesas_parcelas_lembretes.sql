-- Despesas parceladas + lembrete automático de pagamento (tarefa) +
-- histórico de valor (pra alteração de valor de despesa fixa/parcelada não
-- reescrever o resultado de meses já fechados).
alter table public.despesas
  drop constraint despesas_tipo_check,
  add constraint despesas_tipo_check check (tipo in ('fixa', 'variavel', 'parcelada')),
  add column parcelas_total int,
  add column parcela_inicio text; -- "YYYY-MM", primeiro mês da parcela

alter table public.tarefas
  add column origem_despesa_id uuid references public.despesas (id) on delete cascade;

create table public.despesas_historico_valores (
  id uuid primary key default gen_random_uuid(),
  despesa_id uuid not null references public.despesas (id) on delete cascade,
  periodo text not null, -- "YYYY-MM" a partir do qual esse valor vale
  valor numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (despesa_id, periodo)
);

alter table public.despesas_historico_valores enable row level security;

create policy despesas_historico_valores_select on public.despesas_historico_valores
  for select using (auth.uid() is not null);
create policy despesas_historico_valores_admin_write on public.despesas_historico_valores
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
