-- "Fechar o mês" = já recebi tudo (nenhum lote de repasse daquele mês
-- pendente) e já paguei o DAS referente. Guarda o DAS real (valor, vencimento,
-- o PDF em si) por competência — uma vez fechado, o Financeiro usa esse valor
-- real de Simples Nacional em vez da estimativa (alíquota % × comissão).
create table public.fechamentos_mensais (
  periodo text primary key, -- "YYYY-MM"
  das_numero_documento text,
  das_vencimento date,
  das_valor numeric(12,2),
  das_arquivo_nome text,
  das_arquivo_base64 text,
  fechado_em timestamptz,
  fechado_por uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.fechamentos_mensais
  for each row execute function public.set_updated_at();

alter table public.fechamentos_mensais enable row level security;

create policy fechamentos_mensais_select on public.fechamentos_mensais
  for select using (auth.uid() is not null);

create policy fechamentos_mensais_admin_write on public.fechamentos_mensais
  for all using (public.auth_is_admin()) with check (public.auth_is_admin());
