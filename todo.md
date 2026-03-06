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
