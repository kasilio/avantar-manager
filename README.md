# Avantar Manager

Plataforma de gestão para a Avantar (corretora de seguros): clientes, CRM
(kanban de prospecções + follow-up automático), produções, repasses,
tarefas e financeiro (DRE). Login próprio por usuário, com dois papéis:
`admin` (visão completa) e `vendedor` (só a própria carteira).

Sucessora do antigo `avantar-manager.html` (single-file, `localStorage`),
preservado em [`legacy/`](./legacy) como referência. Documentação de
negócio original em [`legacy/AVANTAR_MANAGER_DOC.md`](./legacy/AVANTAR_MANAGER_DOC.md).

## Stack

Next.js 16 (App Router, TypeScript) + Tailwind + shadcn/ui (tema roxo/branco
da identidade Avantar) · Supabase (Postgres + Auth, RLS por papel) · Server
Actions para todo o CRUD · react-hook-form + zod · date-fns.

## Rodando localmente

### Sem credenciais (modo demo)

```bash
npm install
npm run dev
```

Sem um `.env.local`, o app roda em **modo mock**: login automático como
admin, com dados de exemplo em memória — dá pra navegar por todas as telas
sem precisar configurar nada. `npm run lint`, `npx tsc --noEmit` e
`npm run build` também funcionam sem credenciais.

### Com um projeto Supabase (fluxo completo)

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Copie `.env.example` para `.env.local` e preencha
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings > API).
3. No SQL Editor do Supabase Studio, rode os arquivos de
   `supabase/migrations/` em ordem (`0001_core.sql` cria todas as tabelas,
   RLS e os cadastros padrão — tipos de produto, seguradoras e colunas do
   kanban; migrations seguintes ajustam esses dados).
4. Em Authentication > Users, crie o primeiro usuário (você) e copie o UUID.
5. No SQL Editor, insira o registro correspondente em `usuarios` com
   `papel = 'admin'`:
   ```sql
   insert into usuarios (id, nome, email, papel)
   values ('<uuid-copiado>', 'Seu Nome', 'seu@email.com', 'admin');
   ```
6. `npm run dev` e acesse `http://localhost:3000/login`.
7. Daí em diante, novos vendedores são criados pela própria tela
   **Usuários** (cria o login no Supabase Auth automaticamente).

### Checklist de fumaça pós-setup

- [ ] Login funciona com o usuário admin
- [ ] Cadastrar cliente, produção (ver os 6 follow-ups gerados) e repasse
- [ ] Kanban do CRM: arrastar card entre colunas (pede uma observação
      obrigatória a cada movimentação, que fica no histórico da negociação)
- [ ] Criar um vendedor em Usuários, logar com ele e confirmar que só vê a
      própria carteira (teste manual de RLS)
- [ ] Financeiro/DRE e Dashboard refletindo os dados cadastrados

## Estrutura

```
src/app/(auth)/login          # login
src/app/(dashboard)           # shell autenticado (sidebar + header + bottom nav) + módulos
  /clientes, /producoes, /repasses, /crm, /tarefas, /financeiro
  /seguradoras, /tipos-produto, /usuarios   # cadastros (admin)
src/components                # ui (shadcn) + componentes por módulo
src/lib
  /supabase                   # clients browser/server/middleware/admin + mock
  /auth                       # resolução de usuário (papel) da sessão
  /validations                # schemas zod por entidade
  tarefas.ts                  # agregador de tarefas manuais + virtuais
supabase/migrations           # schema versionado (RLS incluída)
legacy/                       # HTML e doc originais, preservados como referência
```
