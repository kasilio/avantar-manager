-- Dados reais de faturamento (repasses da matriz/Avantar via SGCOR,
-- relatórios "PRP01 - Previsão Repasses a pagar", jan/2026 a set/2026).
-- Mesmos UUIDs usados no seed de mock (src/lib/supabase/dev-mock-client.ts)
-- pra manter os dois ambientes equivalentes.
--
-- Clientes entram como pré-cadastro (só nome + tipo_doc) — CNPJ/CPF e demais
-- dados completados manualmente depois. vendedor_id de todas as produções é
-- resolvido pelo e-mail abaixo (troque se não for matheusvillatore@gmail.com)
-- — rode esta migration só DEPOIS de criar esse usuário no Auth e na tabela
-- `usuarios` (passos 4-5 do README), senão a subquery não acha ninguém e as
-- produções não são inseridas (o INSERT roda mas sem gerar erro).
-- Esta migration não é segura pra rodar duas vezes: repasses não tem uma
-- constraint única pra basear um ON CONFLICT, então rodar de novo duplicaria
-- as linhas de repasse.

insert into public.tipos_produto (nome, bloqueada) values
  ('EMPRESARIAL', true)
on conflict (nome) do nothing;

insert into public.seguradoras (nome, bloqueada) values
  ('Yelum', true),
  ('Ezze Seguros', true),
  ('Justos Seguros', true)
on conflict (nome) do nothing;

insert into public.clientes (id, tipo_doc, nome, status) values
  ('40000000-0000-4000-8000-000000000001', 'cnpj', 'E. MARQUES & MARQUES NEGOCIOS LTDA', 'prospect'),
  ('40000000-0000-4000-8000-000000000002', 'cnpj', 'E. MARQUES E J. MARQUES', 'prospect'),
  ('40000000-0000-4000-8000-000000000003', 'cpf', 'REBECA DE CARVALHO FERREIRA', 'prospect'),
  ('40000000-0000-4000-8000-000000000004', 'cnpj', 'BERK LOG LTDA', 'prospect'),
  ('40000000-0000-4000-8000-000000000005', 'cnpj', 'LAL TRANSPORTES DE CARGAS LTDA', 'prospect'),
  ('40000000-0000-4000-8000-000000000006', 'cpf', 'ELAINE RIBEIRO LOBO', 'prospect'),
  ('40000000-0000-4000-8000-000000000007', 'cnpj', 'AGROFRUTAS COMERCIO DE FRUTAS LTDA', 'prospect'),
  ('40000000-0000-4000-8000-000000000008', 'cnpj', 'MARQUES TRANSPORTES E NEGOCIOS LTDA', 'prospect'),
  ('40000000-0000-4000-8000-000000000009', 'cnpj', 'PVN APOIO A EDUCACAO A DISTANCIA LT', 'prospect'),
  ('40000000-0000-4000-8000-000000000010', 'cpf', 'RODRIGO ALMEIDA DO AMARAL', 'prospect'),
  ('40000000-0000-4000-8000-000000000011', 'cpf', 'MILTON EURICO BACELLAR JUNIOR', 'prospect')
on conflict (id) do nothing;

-- Produções: vendedor_id = o admin que rodar esta migration (troque o
-- e-mail se não for matheusvillatore@gmail.com).
with vendedor as (
  select id from auth.users where email = 'matheusvillatore@gmail.com' limit 1
)
insert into public.producoes (
  id, cliente_id, tipo_produto_id, seguradora_id, num_apolice, num_proposta,
  comissao_bruta_pct, parcelas, status_manual, vendedor_id
)
select v.id_producao, v.cliente_id, tp.id, sg.id, v.num_apolice, v.num_proposta,
       v.comissao_bruta_pct, v.parcelas, 'ativa', vendedor.id
from (values
  ('50000000-0000-4000-8000-000000000001'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 'AUTOMÓVEL', 'Yelum', '31.08.2025.0547853', '46040', 18::numeric, '10x'),
  ('50000000-0000-4000-8000-000000000002'::uuid, '40000000-0000-4000-8000-000000000003'::uuid, 'AUTOMÓVEL', 'Allianz', '517720264W310297048', '47849', 18, '10x'),
  ('50000000-0000-4000-8000-000000000003'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040037280000', '46133', 25, '12x'),
  ('50000000-0000-4000-8000-000000000004'::uuid, '40000000-0000-4000-8000-000000000001'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0654 06 0040052040000', '46131', 25, '12x'),
  ('50000000-0000-4000-8000-000000000005'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040037290000', '46134', 25, '12x'),
  ('50000000-0000-4000-8000-000000000006'::uuid, '40000000-0000-4000-8000-000000000002'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0654 06 0040052050000', '46132', 25, '12x'),
  ('50000000-0000-4000-8000-000000000007'::uuid, '40000000-0000-4000-8000-000000000004'::uuid, 'TRANSPORTE-TR', 'Tokio Marine', '540 00103059', '48392', 25, '12x'),
  ('50000000-0000-4000-8000-000000000008'::uuid, '40000000-0000-4000-8000-000000000004'::uuid, 'TRANSPORTE-TR', 'Tokio Marine', '550 00101517', '48391', 25, '12x'),
  ('50000000-0000-4000-8000-000000000009'::uuid, '40000000-0000-4000-8000-000000000005'::uuid, 'FROTA', 'HDI Seguros', '01.035.131.034174', '50511', 25, '10x'),
  ('50000000-0000-4000-8000-000000000010'::uuid, '40000000-0000-4000-8000-000000000005'::uuid, 'FROTA', 'HDI Seguros', '01.035.131.034174 / 0001', '53283', 25, '1x'),
  ('50000000-0000-4000-8000-000000000011'::uuid, '40000000-0000-4000-8000-000000000006'::uuid, 'AUTOMÓVEL', 'Ezze Seguros', '1003100135942', '55696', 10, '3x'),
  ('50000000-0000-4000-8000-000000000012'::uuid, '40000000-0000-4000-8000-000000000005'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '0040045960000', '56590', 25, '12x'),
  ('50000000-0000-4000-8000-000000000013'::uuid, '40000000-0000-4000-8000-000000000005'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '0040062890000', '56592', 25, '12x'),
  ('50000000-0000-4000-8000-000000000014'::uuid, '40000000-0000-4000-8000-000000000007'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0654 06 0040055570000', '49088', 25, '1x'),
  ('50000000-0000-4000-8000-000000000015'::uuid, '40000000-0000-4000-8000-000000000007'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040039790000', '49086', 25, '1x'),
  ('50000000-0000-4000-8000-000000000016'::uuid, '40000000-0000-4000-8000-000000000008'::uuid, 'AUTOMÓVEL', 'Bradesco Seguros', '54044', '57360', 10, '10x'),
  ('50000000-0000-4000-8000-000000000017'::uuid, '40000000-0000-4000-8000-000000000008'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0655 06 0040043590000', '54530', 25, '12x'),
  ('50000000-0000-4000-8000-000000000018'::uuid, '40000000-0000-4000-8000-000000000008'::uuid, 'TRANSPORTE-TR', 'Porto Seguro', '001 0654 06 0040060740000', '54531', 25, '12x'),
  ('50000000-0000-4000-8000-000000000019'::uuid, '40000000-0000-4000-8000-000000000009'::uuid, 'EMPRESARIAL', 'Porto Seguro', '6 118 4232519', '57319', 23, '6x'),
  ('50000000-0000-4000-8000-000000000020'::uuid, '40000000-0000-4000-8000-000000000010'::uuid, 'AUTOMÓVEL', 'Justos Seguros', '02241202605311343320', '57348', 5, '10x'),
  ('50000000-0000-4000-8000-000000000021'::uuid, '40000000-0000-4000-8000-000000000011'::uuid, 'AUTOMÓVEL', 'Porto Seguro', '06 26 0531 29035625', '54161', 10, '10x')
) as v(id_producao, cliente_id, tipo_produto_nome, seguradora_nome, num_apolice, num_proposta, comissao_bruta_pct, parcelas)
join public.tipos_produto tp on tp.nome = v.tipo_produto_nome
join public.seguradoras sg on sg.nome = v.seguradora_nome
cross join vendedor
on conflict (id) do nothing;

insert into public.repasses (producao_id, parcela, periodo, comissao_bruta, apolice_pct, repasse_pct, status)
values
  ('50000000-0000-4000-8000-000000000001', '1/10', '2026-01', 449.68, 18, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000001', '2/10', '2026-02', 449.72, 18, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000002', '1/10', '2026-02', 190.78, 18, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '1/12', '2026-02', 149.59, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '2/12', '2026-03', 516.87, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '3/12', '2026-05', 930.46, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '4/12', '2026-06', 884.63, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '5/12', '2026-06', 838.47, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '6/12', '2026-07', 1020.86, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000003', '7/12', '2026-09', 4.72, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '1/12', '2026-02', 442.09, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '2/12', '2026-03', 809.37, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '3/12', '2026-05', 1222.97, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '4/12', '2026-06', 1177.14, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '5/12', '2026-06', 1130.99, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '6/12', '2026-07', 1313.39, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000004', '7/12', '2026-09', 14.16, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '1/12', '2026-02', 146.25, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '2/12', '2026-03', 291.82, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '3/12', '2026-04', 436.07, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '4/12', '2026-05', 503.93, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '5/12', '2026-06', 345.72, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '6/12', '2026-07', 550.60, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000005', '7/12', '2026-09', 4.72, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '1/12', '2026-02', 438.75, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '2/12', '2026-03', 584.34, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '3/12', '2026-04', 728.60, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '4/12', '2026-05', 796.45, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '5/12', '2026-06', 638.23, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '6/12', '2026-07', 843.13, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000006', '7/12', '2026-09', 14.16, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000007', '1/12', '2026-05', 26.64, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000008', '1/12', '2026-05', 26.64, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000009', '1/10', '2026-05', 12154.21, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000009', '2/10', '2026-06', 12154.21, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000009', '3/10', '2026-07', 6077.12, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000010', '1/1', '2026-05', 334.40, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000011', '1/3', '2026-07', 109.98, 10, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000012', '1/12', '2026-09', 588.80, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000013', '1/12', '2026-09', 671.25, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000014', '1/1', '2026-08', 91.99, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000015', '1/1', '2026-08', 99.07, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000016', '1/10', '2026-08', 643.57, 10, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000017', '1/12', '2026-08', 68.25, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000017', '2/12', '2026-09', 1489.54, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000018', '1/12', '2026-08', 204.75, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000018', '2/12', '2026-09', 1782.07, 25, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000019', '1/6', '2026-08', 64.62, 23, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000020', '1/10', '2026-08', 76.83, 5, 65, 'aguardando_nf'),
  ('50000000-0000-4000-8000-000000000021', '1/10', '2026-06', 220.94, 10, 65, 'aguardando_nf');
