-- Contatos por seguradora (ponto focal / financeiro / averbação) — várias
-- pessoas de contato por seguradora, cada uma com um papel específico. As
-- colunas antigas (susep/cnpj/site/obs) continuam existindo na tabela
-- `seguradoras` (não removidas, seguindo o padrão aditivo do projeto), só
-- deixam de aparecer no formulário/telas.
create table public.seguradoras_contatos (
  id uuid primary key default gen_random_uuid(),
  seguradora_id uuid not null references public.seguradoras (id) on delete cascade,
  tipo text not null check (tipo in ('ponto_focal', 'financeiro', 'averbacao')),
  nome text not null,
  telefone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.seguradoras_contatos
  for each row execute function public.set_updated_at();

alter table public.seguradoras_contatos enable row level security;

create policy seguradoras_contatos_select on public.seguradoras_contatos
  for select using (auth.uid() is not null);
create policy seguradoras_contatos_admin_write on public.seguradoras_contatos
  for insert with check (public.auth_is_admin());
create policy seguradoras_contatos_admin_update on public.seguradoras_contatos
  for update using (public.auth_is_admin()) with check (public.auth_is_admin());
create policy seguradoras_contatos_admin_delete on public.seguradoras_contatos
  for delete using (public.auth_is_admin());
