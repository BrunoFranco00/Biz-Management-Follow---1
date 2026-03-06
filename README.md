# Biz Management Follow

Plataforma web completa de gestão empresarial multi-tenant que substitui planilhas Excel. Permite que organizações criem usuários, acompanhem negócios, atividades e dados customizados através do sistema Smart Grid.

## 🚀 Funcionalidades

### Módulos Principais
- **Dashboard** — KPIs semanais, funil de vendas visual, widgets dinâmicos do Smart Grid
- **Smart Grid** — Planilha dinâmica configurável: admin define colunas, usuários preenchem dados, cálculos automáticos
- **Gestão de Negócios** — Kanban por status (Prospecção / Em Andamento / Fechado / Perdido)
- **Oportunidades** — Rastreamento de oportunidades de venda
- **Atividades** — Registro de prospecção (ligações, e-mails, visitas)
- **Objeções** — Registro e respostas a objeções de clientes
- **Planejamento Semanal** — Metas e ações da semana
- **Check-in Semanal** — Wizard guiado com score de performance (0–100)
- **Relatório PDF** — Geração automática de relatório semanal completo

### Administração
- **Painel Admin** — Visão consolidada de todos os usuários da organização
- **Gestão de Usuários** — Criar slots (User1–UserN), resetar senhas, ativar/desativar
- **Personalização** — Labels editáveis para todos os módulos
- **Super Admin** — Acesso total a todas as organizações

### Smart Grid — Recursos Avançados
- Tipos de coluna: Texto, Número, Lista, Data, Sim/Não, Fórmula/Cálculo
- Fórmulas: Soma, Média, Porcentagem, Média Ponderada, Contagem, Máximo, Mínimo
- Ordenação por qualquer coluna (A→Z, maior→menor)
- Exportação: Excel (.xlsx), PDF, Imagem (PNG)
- Colunas fixas (sticky) na visão consolidada
- Ocultar/mostrar colunas e linhas
- Cálculos automáticos exibidos acima do cabeçalho
- **Importação Excel** — Upload de planilha com mapeamento de colunas e preview

## 🏗️ Arquitetura

### Stack Tecnológica
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Estilização | Tailwind CSS 4 + shadcn/ui |
| Backend | Node.js + Express 4 |
| API | tRPC 11 (type-safe end-to-end) |
| Banco de Dados | MySQL/TiDB (via Drizzle ORM) |
| Autenticação | JWT local (username/senha) |
| Testes | Vitest (24 testes) |

### Multi-tenancy
- Isolamento de dados por `organizationId` em todas as tabelas
- Role-based access: `super_admin` → `admin` → `user`
- Super Admin pode alternar entre organizações em tempo real

### Segmentos Suportados
- **Clínica GAMA** — Clínica de Estética
- **BFAGRO** — Agronegócio
- Templates customizáveis por segmento de negócio

## 📁 Estrutura do Projeto

```
├── client/                    # Frontend React
│   ├── src/
│   │   ├── pages/             # Páginas da aplicação
│   │   │   ├── SmartGrid.tsx  # Módulo Smart Grid completo
│   │   │   ├── Dashboard.tsx  # Dashboard executivo
│   │   │   ├── Deals.tsx      # Gestão de negócios
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx  # Layout principal com sidebar
│   │   │   └── ui/            # Componentes shadcn/ui
│   │   ├── contexts/
│   │   │   ├── LocalAuthContext.tsx  # Autenticação JWT local
│   │   │   └── ActiveOrgContext.tsx  # Org ativa (Super Admin)
│   │   └── lib/
│   │       ├── trpc.ts        # Cliente tRPC
│   │       └── format.ts      # Formatação monetária (R$ 11.000,00)
│   └── index.html
│
├── server/                    # Backend Node.js/Express
│   ├── routers.ts             # Router principal tRPC
│   ├── routers/
│   │   └── grid.ts            # Router do Smart Grid
│   ├── db.ts                  # Helpers de banco de dados
│   ├── gridDb.ts              # Helpers específicos do Smart Grid
│   ├── localAuth.ts           # Autenticação local (JWT)
│   ├── localAuthRoutes.ts     # Rotas de auth (login/logout)
│   ├── storage.ts             # S3 file storage
│   ├── auth.logout.test.ts    # Testes de auth
│   ├── crm.test.ts            # Testes do CRM
│   └── grid.test.ts           # Testes do Smart Grid
│
├── drizzle/                   # Schema e migrações do banco
│   ├── schema.ts              # Definição de todas as tabelas
│   ├── relations.ts           # Relações entre tabelas
│   └── *.sql                  # Arquivos de migração
│
├── shared/                    # Código compartilhado frontend/backend
│   ├── types.ts               # Tipos TypeScript compartilhados
│   ├── const.ts               # Constantes globais
│   └── segmentTemplates.ts    # Templates por segmento de negócio
│
├── scripts/
│   └── seed-local-users.mjs   # Script para criar usuários iniciais
│
├── todo.md                    # Histórico de features e roadmap
├── package.json
├── drizzle.config.ts
├── vite.config.ts
└── tsconfig.json
```

## ⚙️ Configuração e Instalação

### Pré-requisitos
- Node.js 22+
- pnpm
- Banco de dados MySQL/TiDB (variável `DATABASE_URL`)

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/BrunoFranco00/Biz-Management-Follow---1.git
cd Biz-Management-Follow---1

# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Executar migrações do banco
pnpm db:push

# Criar usuários iniciais
node scripts/seed-local-users.mjs

# Iniciar em desenvolvimento
pnpm dev
```

### Variáveis de Ambiente

```env
DATABASE_URL=          # String de conexão MySQL/TiDB
JWT_SECRET=            # Segredo para assinar tokens JWT
VITE_APP_ID=           # ID da aplicação Manus OAuth
OAUTH_SERVER_URL=      # URL do servidor OAuth Manus
BUILT_IN_FORGE_API_URL= # URL das APIs internas Manus
BUILT_IN_FORGE_API_KEY= # Chave das APIs internas Manus
```

## 🔐 Credenciais Padrão

| Usuário | Senha | Role | Organização |
|---------|-------|------|-------------|
| `superadmin` | `Biz@102030` | Super Admin | — |
| `admin_org1` | `Biz@102030` | Admin | Clinica GAMA |
| `admin_org2` | `Biz@102030` | Admin | BFAGRO |
| `User1` | `Biz@102030` | Usuário | (por org) |

> ⚠️ **Altere as senhas padrão em produção.**

## 🧪 Testes

```bash
pnpm test
```

24 testes passando cobrindo autenticação, CRM e Smart Grid.

## 📦 Scripts Disponíveis

```bash
pnpm dev          # Servidor de desenvolvimento (frontend + backend)
pnpm build        # Build de produção
pnpm test         # Executar testes Vitest
pnpm db:push      # Aplicar migrações do banco (drizzle-kit generate + migrate)
```

## 🗄️ Banco de Dados — Principais Tabelas

| Tabela | Descrição |
|--------|-----------|
| `organizations` | Organizações/empresas cadastradas |
| `org_users` | Usuários por organização (auth local) |
| `deals` | Negócios/clientes |
| `opportunities` | Oportunidades de venda |
| `activities` | Atividades de prospecção |
| `grid_templates` | Templates de colunas do Smart Grid |
| `grid_columns` | Colunas configuradas por organização |
| `grid_rows` | Dados preenchidos pelos usuários |
| `weekly_checkins` | Check-ins semanais de performance |
| `system_labels` | Labels personalizados pelo admin |

## 🎨 Design

- **Tema**: Dark (navy/slate) com accent dourado
- **Tipografia**: Inter (Google Fonts)
- **Componentes**: shadcn/ui + Tailwind CSS 4
- **Responsivo**: Mobile, tablet e desktop
- **Formatação monetária**: Padrão pt-BR (R$ 11.000,00)

---

Desenvolvido com [Manus](https://manus.im) · Stack: React + tRPC + Drizzle + MySQL
