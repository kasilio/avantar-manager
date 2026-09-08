# Avantar Manager — Documentação do Projeto

**Arquivo principal:** `avantar-manager.html`  
**Stack:** HTML/CSS/JS puro (single-file), sem frameworks  
**Persistência:** `localStorage` com chave `avantar_mgr_v1`  
**Corretor:** Matheus Eduardo Magalhães Villatore · SUSEP KJK90J  
**Unidade:** Avantar (Magalhães Assessoria e Corretora de Seguros)

---

## Arquitetura

```
avantar-manager.html
├── <style>          CSS global + variáveis de tema
├── <body>
│   ├── .sidebar     Nav lateral fixa (desktop)
│   ├── .main
│   │   ├── .topbar  Título da página + seletor de mês
│   │   └── .content Área de conteúdo dinâmica (#app)
│   └── bottom nav   Navegação mobile (4 tabs + drawer)
└── <script>
    ├── DB / helpers
    ├── Módulos (render* + CRUD)
    └── Init
```

### Paleta (Tema Claro Avantar)
```css
--bg:       #f4f2fb   /* fundo geral */
--bg2:      #ffffff   /* cards e modais */
--bg3:      #ede9f8   /* superfícies secundárias */
--purple:   #6200EA   /* cor principal Avantar */
--purple2:  #7C22FF
--text:     #1a1030
--green:    #16a34a
--red:      #dc2626
--blue:     #2563eb
--amber:    #d97706
```

---

## Estrutura do DB (`localStorage`)

```js
{
  clientes:           [],   // clientes cadastrados
  prospeccoes:        [],   // leads / prospecções CRM
  producoes:          [],   // apólices / produções
  repasses:           [],   // comissões recebidas da Avantar
  despesas:           [],   // despesas fixas e variáveis
  despesas_pagas:     {},   // { chave: data } — controle mensal
  receitas_avulsas:   [],   // não usado ativamente
  followups_concluidos: {}, // { chave_fu: data }
  tarefas:            [],   // tarefas manuais
  vendedores:         [],   // assessores
  seguradoras:        [],   // seguradoras cadastradas (extras)
  tipos_produto:      [],   // { id, nome, descricao } extras
  crm_colunas:        [],   // colunas personalizadas do kanban
  settings: {
    aliquota_simples: 6     // % Simples Nacional
  }
}
```

---

## Módulos (páginas)

### 📊 Visão Geral (Dashboard)
- Seletor de mês global (navega histórico + previsão futura)
- 4 stat cards: Comissão Recebida, Simples Nacional, Produções Ativas, Resultado Estimado
- **Modo Previsão** (meses futuros): média de repasses TR dos últimos 3 meses por cliente
- Alertas automáticos: apólices vencendo, follow-ups atrasados, tarefas vencidas, aniversários
- Cards "Tarefas de Hoje" e "Tarefas de Amanhã"
- CRM Visão Rápida (pipeline + follow-ups)

### 💬 CRM
- **Aba Follow-up Automático:** gerado automaticamente de cada produção
  - Cronograma: 7d (indicação), 30d (necessidades), 90d (outro produto), 180d (6m), 270d (9m), 330d (renovação)
  - Chave: `fu_{prod.id}_{dias}` → `db.followups_concluidos`
- **Aba Prospecções (Kanban):**
  - Colunas configuráveis via `db.crm_colunas`
  - Colunas padrão (bloqueadas): Novo Lead, Em Contato, Proposta, Fechado, Perdido, Follow-up
  - Drag-and-drop nativo entre colunas
  - Automação: ao mover para "Perdido" → agenda follow-up em 2 meses → move para "Follow-up"
  - Botão ⚙️ Colunas: criar, editar, excluir colunas personalizadas
  - Cards com: empresa, cliente vinculado, produto, data próx. contato, obs
  - Ações nos cards: ✏️ Editar, 📞 Registrar contato, ✅ Criar tarefa, 🗑️ Remover, 📱 WhatsApp

### ✅ Tarefas
- **Quadro** (ordenado por data): seções Vencidas / Hoje / Próximas / Concluídas
- **Calendário** mensal com dots coloridos por tipo
- Tipos de tarefa (todas convergem no quadro):
  - Manual (criada pelo usuário)
  - Follow-up automático (de produções)
  - Follow-up de prospecção (next_contact do CRM)
  - Vencimento de despesa (`__desp__{id}`)
  - Aniversário de cliente/contato (`__aniv__{id}`)
- Criar tarefa clicando num dia do calendário
- Ver detalhe clicando na tarefa do calendário

### 📄 Repasses
- Vinculado obrigatoriamente a uma **Produção**
- Workflow de status: `aguardando_nf` → `aguardando_pagamento` → `pago`
- Campos: produção vinculada, parcela, período, comissão bruta (R$), % apólice, % repasse, NF, pagamento
- Botões rápidos: 🧾 Informar NF, 💰 Registrar pagamento
- Máscaras monetárias (R$) em todos os campos

### 🛡️ Produções
- Cliente obrigatório (só clientes cadastrados)
- Campos: tipo de produto, seguradora, nº apólice/proposta, prêmio mensal/total
- **Comissão com split 35/65:** % bruta → Avantar 35% / Unidade 65% (calculado automaticamente)
- Vendedor: seleção com %, ou "🏢 Unidade (sem vendedor)"
- Vigência (início/fim) + data renovação + status
- Status derivado: ativa / vencendo (≤30d) / vencida / cancelada
- Gera follow-ups automáticos no CRM ao ser cadastrada
- Auto-seta status do cliente para "Ativo" ao salvar

### 💰 Financeiro (DRE)
- Seletor de mês (compartilhado com Dashboard)
- Filtros por `repasse.periodo` (formato `YYYY-MM`)
- DRE: Comissões pagas → Simples → Comissão líquida → Despesas fixas → Variáveis → Comissões vendedores → Resultado
- Modo previsão para meses futuros (igual Dashboard)
- Gestão de despesas: fixas (vencimento dia do mês) + variáveis (data exata)
- Vencimentos de despesas viram tarefas automáticas

---

## Cadastros

### 🏢 Clientes
- Tipo: PJ (CNPJ) ou PF (CPF)
- Busca CNPJ via BrasilAPI (preenche razão, endereço, CNAE, situação)
- Busca CEP via ViaCEP (preenche logradouro, bairro, cidade/UF)
- Endereço completo: CEP, logradouro, número, bairro, cidade/UF
- Data de nascimento (PF) → gera tarefa de aniversário
- Status: 🔵 Prospect (padrão) → 🟢 Ativo (auto ao ter produção) → ⚫ Inativo
- Contatos: nome, cargo, WhatsApp, email, aniversário (gera tarefa)

### 🏦 Seguradoras
- Padrão (13 seguradoras bloqueadas): Porto Seguro, HDI, Allianz, Bradesco, etc.
- Cadastro extra: nome, SUSEP, CNPJ, telefone, site, obs
- Alimenta select de Seguradora nas Produções

### 🏷️ Tipos de Produto
- Padrão (7 bloqueados): TRANSPORTE-TR, FROTA, AUTOMÓVEL, VIDA MOTORISTA, PATRIMONIAL, RC GERAL, OUTRO
- Cadastro extra: nome (obrigatório) + descrição
- Suporte a edição com atualização em cascata (produções e prospecções)
- Alimenta selects de Tipo de Produto em Produções e CRM

### 👤 Vendedores
- CPF (máscara), SUSEP, email, WhatsApp, PIX, obs
- Comissão calculada sobre repasses pagos por cliente vinculado

---

## Funções Auxiliares

```js
// Formatação
fmt(n)                    // R$ 0,00
fmtDate(str)              // DD/MM/AAAA
formatMoney(input)        // máscara R$ enquanto digita
parseMoney(input)         // extrai float de campo R$
initMoney(id, value)      // inicializa campo R$ com valor salvo
formatCNPJ(input)         // 00.000.000/0001-00
formatCPF(input)          // 000.000.000-00
formatCEP(input)          // 00000-000

// API externa
buscarCNPJ()              // BrasilAPI → preenche form cliente PJ
buscarCEP()               // ViaCEP → preenche endereço

// Navegação
setPage(p)                // troca de módulo, atualiza nav
render()                  // re-renderiza página atual
navMes(dir)               // navega mês no Dashboard/Financeiro
voltarHoje()              // reseta seletor de mês

// DB
saveDB()                  // salva localStorage
loadDB()                  // carrega com defaultDB como fallback

// Seletor de mês
mesSelecionado()          // { year, month }
mesStr(ms)                // 'YYYY-MM'
isFuture(ms)              // boolean
previsaoFaturamento()     // { total, clientes[] }

// Kanban
kbDragStart/End/Over/Enter/Leave/Drop()
verificarFollowupsPerdidos()  // cron: perdido ≥ 2m → followup
getCRMColunas()               // retorna/inicializa colunas do kanban
openGerenciarColunas()        // modal de gestão de colunas

// Tarefas
todasTarefas()            // manuais + virtuais (followup, despesas, aniversários)
verTarefaDetalhe(id)      // modal com detalhe e ações

// Misc
uid()                     // ID único
today()                   // 'YYYY-MM-DD'
daysUntilBirthday(str)    // dias até próx. aniversário (mês/dia)
escHtml(s)                // sanitiza HTML
ramo_badge(ramo)          // badge colorido por tipo
status_badge(s)           // badge de status cliente
```

---

## Seletor de Mês Global (`_mesSel`)
```js
let _mesSel = null; // null = mês atual, { year, month } = mês específico
```
Compartilhado entre Dashboard e Financeiro. Meses futuros ativam modo previsão baseado na média dos últimos 3 meses de repasses de seguro de transporte por cliente.

---

## CRM Colunas (`db.crm_colunas`)
```js
// Estrutura de cada coluna
{
  id:       string,   // identificador único (slug para padrão, uuid para custom)
  label:    string,   // nome exibido
  icon:     string,   // emoji
  color:    string,   // var(--blue) etc.
  sistema:  boolean,  // true = bloqueada
  bloqueada: boolean, // oculta botão "+ Adicionar"
  nota:     string,   // texto info abaixo do header (ex: followup)
}
```

---

## Follow-up Automático (de Produções)
```js
const FOLLOWUP_SCHEDULE = [
  { dias: 7,   motivo: 'Pedir indicação'           },
  { dias: 30,  motivo: 'Verificar necessidades'    },
  { dias: 90,  motivo: 'Oferecer outro produto'    },
  { dias: 180, motivo: 'Verificar necessidades (6m)' },
  { dias: 270, motivo: 'Verificar necessidades (9m)' },
  { dias: 330, motivo: 'Falar sobre renovação'    },
];
// Chave: `fu_{prod.id}_{dias}`
// Concluídos em: db.followups_concluidos[chave] = date
```

---

## Comissão Split (Produções)
```
Comissão Bruta (%) → Avantar: 35% / Unidade: 65%
Campos salvos: comissao_bruta_pct, comissao_avantar_pct, comissao_unidade_pct
```

---

## Automações
| Trigger | Ação |
|---|---|
| Produção cadastrada | Auto-seta cliente → Ativo |
| Produção cadastrada | Gera 6 follow-ups automáticos no CRM |
| Prospecção → Perdido | Agenda next_contact +2 meses |
| next_contact de Perdido atingido | Move para coluna Follow-up |
| Despesa com vencimento | Aparece como tarefa automática |
| Cliente/contato com aniversário | Aparece como tarefa (365 dias de antecedência no calendário, 30 no quadro) |

---

## Máscaras Implementadas
- **R$:** campo `type="text"` + `oninput="formatMoney(this)"` → `parseMoney()` ao salvar
- **CNPJ:** `formatCNPJ(input)` → `00.000.000/0001-00`
- **CPF:** `formatCPF(input)` → `000.000.000-00`
- **CEP:** `formatCEP(input)` → `00000-000`

---

## APIs Externas
| API | Uso | URL |
|---|---|---|
| BrasilAPI | Busca CNPJ | `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` |
| ViaCEP | Busca CEP | `https://viacep.com.br/ws/{cep}/json/` |

---

## Pendências / Ideias Futuras
- Importação de extrato de repasses (PDF/CSV)
- Relatórios exportáveis (PDF/Excel)
- Multi-usuário / autenticação
- Backup/restore do localStorage
- Metas mensais configuráveis (atualmente hardcoded em R$ 15.000)
- Notificações push para follow-ups
