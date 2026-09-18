-- 4 apólices achadas na pasta APÓLICES/ sem produção correspondente ainda
-- (JWMF Transportes tem duas: RC-DC e RCTR-C; A J T Transporte; e uma nova
-- apólice Yelum do Rodrigo Almeida, além da Justos que ele já tinha).
-- Comissão %, proposta e vendedor não vêm no PDF da apólice — ajustar depois.
insert into public.producoes (
  cliente_id, tipo_produto_id, seguradora_id, num_apolice,
  vigencia_inicio, vigencia_fim, status_manual, vendedor_id, obs
)
select c.id, tp.id, sg.id, v.num_apolice, v.vigencia_inicio::date, v.vigencia_fim::date, 'ativa', vend.id, v.obs
from (values
  ('JWMF TRANSPORTES E LOGISTICA LTDA', 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040047270000', '2026-08-03', '2027-08-03', 'Cadastrada a partir da apólice (RC-DC) — comissão e proposta pendentes.'),
  ('JWMF TRANSPORTES E LOGISTICA LTDA', 'TRANSPORTE-TR', 'Porto Seguro', '001 0654 06 0040064180000', '2026-08-03', '2027-08-03', 'Cadastrada a partir da apólice (RCTR-C) — comissão e proposta pendentes.'),
  ('A J T TRANSPORTE LOGISTICA LTDA', 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040047730000', '2026-08-12', '2027-08-12', 'Cadastrada a partir da apólice — comissão e proposta pendentes.'),
  ('RODRIGO ALMEIDA DO AMARAL', 'AUTOMÓVEL', 'Yelum', '31.08.2026.0559071', '2026-09-09', '2027-09-09', 'Cadastrada a partir da apólice — comissão e proposta pendentes. Rodrigo já tinha outra apólice (Justos) além desta.')
) as v(cliente_nome, tipo_produto_nome, seguradora_nome, num_apolice, vigencia_inicio, vigencia_fim, obs)
join public.clientes c on c.nome = v.cliente_nome
join public.tipos_produto tp on tp.nome = v.tipo_produto_nome
join public.seguradoras sg on sg.nome = v.seguradora_nome
cross join (select id from auth.users where email = 'matheusvillatore@gmail.com' limit 1) as vend;
