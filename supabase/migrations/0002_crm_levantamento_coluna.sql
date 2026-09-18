-- Adiciona a coluna "Levantamento de Necessidades" entre "Em Contato" e
-- "Proposta" no funil do CRM, e renomeia "Proposta" para "Proposta /
-- Apresentação".

update public.crm_colunas set ordem = ordem + 1 where id in ('proposta', 'fechado', 'perdido', 'followup');

insert into public.crm_colunas (id, label, icon, color, sistema, bloqueada, nota, ordem) values
  ('levantamento', 'Levantamento de Necessidades', '🔎', 'var(--blue)', true, true, null, 3);

update public.crm_colunas set label = 'Proposta / Apresentação' where id = 'proposta';
