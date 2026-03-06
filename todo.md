# CRM de Vendas - TODO

## Backend / Banco de Dados
- [x] Schema: tabelas weekly_reports, kpi_metrics, sales_funnel_entries
- [x] Schema: tabelas opportunities, lost_opportunities
- [x] Schema: tabelas activities, lead_sources
- [x] Schema: tabelas objections, operational_difficulties
- [x] Schema: tabelas weekly_plans, weekly_actions, weekly_support
- [x] Schema: tabelas strategic_actions
- [x] Schema: tabelas products, regions (configurações flexíveis)
- [x] pnpm db:push para migrar schema
- [x] Router: weekly_reports (CRUD)
- [x] Router: kpis (métricas semanais)
- [x] Router: sales_funnel (funil de vendas)
- [x] Router: opportunities (oportunidades)
- [x] Router: activities (atividades de prospecção)
- [x] Router: objections (objeções)
- [x] Router: weekly_plans (planejamento)
- [x] Router: strategic_actions (ações estratégicas)
- [x] Router: admin (visão consolidada, filtros)
- [x] Router: config (produtos, regiões)

## Frontend / Design System
- [x] Design system: paleta de cores elegante (dark/navy + gold accent)
- [x] Fontes: Inter + tipografia profissional
- [x] DashboardLayout customizado com sidebar elegante
- [x] Página de Login elegante
- [x] Rotas protegidas por role (vendedor/admin)

## Páginas - Vendedor
- [x] Dashboard executivo com KPIs semanais
- [x] Funil de vendas visual (5 estágios)
- [x] Gestão de oportunidades (lista + formulário)
- [x] Rastreamento de atividades de prospecção
- [x] Registro de objeções
- [x] Planejamento semanal
- [x] Ações estratégicas

## Páginas - Admin
- [x] Dashboard admin consolidado (todos os vendedores)
- [x] Filtros por período, região e usuário
- [x] Comparativo entre vendedores
- [x] Configurações: produtos/serviços e regiões

## Testes
- [x] Testes vitest para routers principais (14 testes passando)
- [x] Checkpoint final

## Expansão v2 - Novas Funcionalidades

### Schema / Banco de Dados
- [x] Tabela system_labels (personalização de labels pelo admin)
- [x] Tabela deals (gestão completa de negócios/clientes)
- [x] Tabela weekly_checkins (check-in semanal de performance)
- [x] pnpm db:push para migrar novas tabelas

### Backend (Routers)
- [x] Router: labels (CRUD de personalização de labels)
- [x] Router: deals (CRUD completo de negócios)
- [x] Router: checkins (check-in semanal)
- [x] Router: report (geração de dados para relatório semanal)

### Módulo Gestão de Negócios
- [x] Listagem de negócios com filtros (status, região, produto, período)
- [x] Formulário de cadastro: cliente, região, procedimento, valor, datas, status
- [x] Status: Prospecção / Em Andamento / Fechado / Perdido
- [x] Kanban visual por status
- [x] Indicadores: ticket médio, taxa de fechamento, ciclo médio de venda

### Módulo Personalização Admin
- [x] Interface para editar labels de atividades (Ligações, E-mails, etc.)
- [x] Interface para editar labels do funil de vendas
- [x] Interface para editar labels dos KPIs do dashboard
- [x] Interface para editar nomes do menu lateral
- [x] Persistência no banco e aplicação em tempo real

### Relatório Semanal PDF
- [x] Geração de PDF com todas as seções do app
- [x] Capa com nome do vendedor, período e score
- [x] Seção de KPIs e metas vs realizado
- [x] Seção de funil de vendas
- [x] Seção de atividades de prospecção
- [x] Seção de objeções e respostas
- [x] Seção de planejamento da próxima semana
- [x] Seção de ações estratégicas
- [x] Seção de check-in semanal
- [x] Botão de impressão/PDF na interface

### Mobile / Responsividade
- [x] Sidebar colapsável em mobile (hamburguer menu)
- [x] Cards e tabelas adaptados para telas pequenas
- [x] Formulários responsivos
- [x] Dashboard mobile-first
- [x] Botões e inputs com tamanho adequado para toque

### Melhorias de Acompanhamento Semanal
- [x] Check-in semanal guiado (wizard passo a passo)
- [x] Score de performance do vendedor (0-100)
- [x] Indicadores de humor semanal

## v3 — Multi-tenant & Escalabilidade

### Sprint 1: Multi-tenancy
- [x] Tabela organizations no schema
- [x] Campo organizationId em todas as tabelas de dados
- [x] Role super_admin adicionado ao enum
- [x] pnpm db:push para migrar
- [x] Todos os helpers do db.ts filtrados por organizationId
- [x] Todos os routers filtrados por organizationId do usuário logado

### Sprint 2: Templates de Segmento
- [x] Definição dos templates (Clínica, Agro, Genérico) em shared/
- [x] Fluxo de onboarding: criar organização + escolher segmento
- [x] Pré-configuração automática de KPIs, funil e atividades por template
- [x] Página de onboarding para novos usuários sem organização

### Sprint 3: Painel Super Admin
- [x] Rota /super-admin protegida por role super_admin
- [x] Listagem de todas as organizações com status e contagem de usuários
- [x] Criar nova organização (nome, segmento, admin responsável)
- [x] Ativar/desativar organização
- [x] Promover usuário a admin de uma organização
- [x] Visão de saúde: últimas atividades por organização

### Sprint 4: Identidade Visual
- [x] Renomear SalesFlow CRM → Biz Management Follow
- [x] Atualizar VITE_APP_TITLE
- [x] Atualizar logo e favicon
- [x] Atualizar todas as referências de nome no código

## v4 — Sistema de Usuários Locais (Auth Próprio)

### Schema / Banco de Dados
- [ ] Tabela org_users (slots fixos por organização: username, passwordHash, displayName, slot)
- [ ] Tabela org_sessions (sessões locais independentes do OAuth Manus)
- [ ] pnpm db:push para migrar

### Backend
- [ ] Endpoint de login local (POST /api/local-auth/login)
- [ ] Endpoint de logout local
- [ ] Router: orgUsers.list (admin lista slots da organização)
- [ ] Router: orgUsers.create (admin cria slots User1..UserN com senha padrão)
- [ ] Router: orgUsers.resetPassword (admin reseta senha de qualquer slot)
- [ ] Router: orgUsers.updateProfile (usuário altera próprio nome e senha)
- [ ] Middleware de sessão local (JWT próprio para org_users)

### Frontend
- [ ] Tela de login local (username + senha, sem OAuth)
- [ ] Painel de gestão de usuários (admin): listar slots, criar lote, resetar senha
- [ ] Tela de perfil do usuário: alterar nome e senha
- [ ] Integrar auth local em todas as rotas protegidas
- [ ] Ajustar DashboardLayout para exibir displayName e slot do usuário local

## Bugs reportados (06/03/2026)

- [x] Corrigir erro "An unexpected error occurred" ao clicar em + Negócios (backend OK, versão publicada desatualizada)
- [x] Corrigir sidebar do super_admin: mostrar opções de Gestão e Painel Admin
- [x] Super Admin deve acessar painel admin de TODAS as organizações com acesso completo
- [x] Mostrar badge/role correto para super_admin no sidebar (não "Vendedor")
