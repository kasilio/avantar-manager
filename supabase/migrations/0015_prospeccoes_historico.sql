-- Histórico da negociação: toda movimentação de coluna de uma prospecção
-- fica registrada, com observação obrigatória (arrastar o card ou usar
-- "Enviar para a próxima etapa" sempre passam por uma nota).
create table public.prospeccoes_historico (
  id uuid primary key default gen_random_uuid(),
  prospeccao_id uuid not null references public.prospeccoes (id) on delete cascade,
  coluna_anterior text not null references public.crm_colunas (id),
  coluna_nova text not null references public.crm_colunas (id),
  nota text not null,
  usuario_id uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.prospeccoes_historico enable row level security;

create policy prospeccoes_historico_select on public.prospeccoes_historico
  for select using (auth.uid() is not null);
create policy prospeccoes_historico_insert on public.prospeccoes_historico
  for insert with check (auth.uid() is not null);
