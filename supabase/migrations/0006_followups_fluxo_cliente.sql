-- Substitui o cronograma genérico de follow-up (7/30/90/180/270/330 dias,
-- motivos vagos) por um fluxo de relacionamento com o cliente, com motivos
-- específicos que viram mensagem pronta na tela (ver src/lib/mensagens.ts —
-- os textos de `motivo` abaixo são a chave usada lá, têm que bater com
-- src/lib/followups-schedule.ts também, usado pelo mock client local).
create or replace function public.gerar_followups()
returns trigger
language plpgsql
as $$
declare
  base date := coalesce(new.vigencia_inicio, current_date);
begin
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

-- Regenera o cronograma pras produções que já existem — o trigger só roda em
-- INSERT. Remove os follow-ups pendentes do cronograma antigo (concluídos
-- ficam como histórico) e recria já com os motivos novos.
delete from public.followups
where concluido_em is null
  and motivo in (
    'Verificar necessidades', 'Oferecer outro produto',
    'Verificar necessidades (6m)', 'Verificar necessidades (9m)', 'Falar sobre renovação'
  );

insert into public.followups (producao_id, dias, motivo, due_date)
select p.id, v.dias, v.motivo, (coalesce(p.vigencia_inicio, p.created_at::date) + v.dias)
from public.producoes p
cross join (values
  (2,   'Agradecer o fechamento'),
  (14,  'Pedir indicação'),
  (60,  'Ofertar um novo produto'),
  (180, 'Verificar se está tudo bem'),
  (300, 'Reforçar benefícios da apólice'),
  (330, 'Negociar renovação')
) as v(dias, motivo)
where not exists (
  select 1 from public.followups f where f.producao_id = p.id and f.motivo = v.motivo
);
