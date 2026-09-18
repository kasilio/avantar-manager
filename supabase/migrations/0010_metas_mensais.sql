-- Meta de faturamento por mês. Gerada automaticamente (média histórica) na
-- primeira visita à Visão Geral de um mês sem meta salva, e editável à mão
-- depois — não é o mesmo campo que `settings.meta_mensal` (que continua
-- existindo, sem uso neste painel).
create table public.metas_mensais (
  periodo text primary key, -- "YYYY-MM"
  valor numeric(12,2) not null,
  gerado_automaticamente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.metas_mensais
  for each row execute function public.set_updated_at();

alter table public.metas_mensais enable row level security;

create policy metas_mensais_select on public.metas_mensais
  for select using (auth.uid() is not null);

create policy metas_mensais_admin_write on public.metas_mensais
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
