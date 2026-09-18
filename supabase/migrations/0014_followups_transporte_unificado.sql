-- Apólices de Transporte costumam sair em mais de uma produção pro mesmo
-- cliente no mesmo dia (ex. RC-DC + RCTR-C da mesma negociação). Pro cliente
-- não receber "Agradecer o fechamento"/"Pedir indicação"/etc. duplicados no
-- mesmo dia, o fluxo de relacionamento só é gerado pra primeira produção de
-- Transporte daquele cliente naquele dia — as demais contam como parte do
-- mesmo pacote comercial.
create or replace function public.gerar_followups()
returns trigger
language plpgsql
as $$
declare
  base date := coalesce(new.vigencia_inicio, current_date);
  eh_transporte boolean;
  ja_coberta boolean := false;
begin
  select exists (
    select 1 from public.tipos_produto tp
    where tp.id = new.tipo_produto_id and tp.nome ilike '%transporte%'
  ) into eh_transporte;

  if eh_transporte then
    select exists (
      select 1
      from public.producoes p
      join public.tipos_produto tp on tp.id = p.tipo_produto_id
      where p.id <> new.id
        and p.cliente_id = new.cliente_id
        and tp.nome ilike '%transporte%'
        and coalesce(p.vigencia_inicio, p.created_at::date) = base
    ) into ja_coberta;
  end if;

  if ja_coberta then
    return new;
  end if;

  insert into public.followups (producao_id, dias, motivo, due_date) values
    (new.id, 2,   'Agradecer o fechamento',       base + 2),
    (new.id, 14,  'Pedir indicação',               base + 14),
    (new.id, 60,  'Ofertar um novo produto',       base + 60),
    (new.id, 180, 'Verificar se está tudo bem',    base + 180),
    (new.id, 300, 'Reforçar benefícios da apólice', base + 300),
    (new.id, 330, 'Negociar renovação',            base + 330);
  return new;
end;
$$;

-- Limpa a duplicidade que já existe pras produções cadastradas antes dessa
-- mudança: em cada grupo (cliente + dia) de produções de Transporte, mantém
-- só os follow-ups pendentes da produção mais antiga do grupo.
with grupos as (
  select
    p.id as producao_id,
    p.cliente_id,
    coalesce(p.vigencia_inicio, p.created_at::date) as base,
    row_number() over (
      partition by p.cliente_id, coalesce(p.vigencia_inicio, p.created_at::date)
      order by p.created_at
    ) as posicao
  from public.producoes p
  join public.tipos_produto tp on tp.id = p.tipo_produto_id
  where tp.nome ilike '%transporte%'
)
delete from public.followups f
using grupos g
where f.producao_id = g.producao_id
  and g.posicao > 1
  and f.concluido_em is null;
