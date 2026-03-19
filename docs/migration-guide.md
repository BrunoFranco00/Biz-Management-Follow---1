# Guia de Migração — Manus → Railway + Vercel

## Visão geral

```
Manus (atual)          Railway + Vercel (destino)
─────────────          ──────────────────────────
TiDB (banco)    →      MySQL Railway
Express API     →      Railway (backend)
React/Vite      →      Vercel (frontend)
bizmanapp.live  →      domínio mantido, redirecionado
```

Tempo estimado: 2 a 4 horas no total.
O app fica online o tempo todo — zero downtime.

---

## ETAPA 1 — Preparar o código (15 min)

No terminal, dentro da pasta do projeto:

```bash
cd /Users/bruno/Biz-Management-Follow---1
bash scripts/3-prepare-migration.sh
```

O que esse script faz automaticamente:
- Remove `vite-plugin-manus-runtime` do código
- Atualiza `vite.config.ts` sem plugins Manus
- Cria `railway.json` e `vercel.json`
- Cria `.env.example`
- Cria pipeline CI/CD no GitHub Actions
- Remove senhas do README.md
- Testa o build

---

## ETAPA 2 — Exportar banco do TiDB (5 min)

```bash
bash scripts/1-export-database.sh
```

Gera um arquivo `backup-YYYYMMDD-HHMMSS.sql` na pasta do projeto.
Guarde esse arquivo — é o backup dos seus dados.

**Pré-requisito:** ter `mysql` instalado. Se não tiver:
```bash
brew install mysql-client
```

---

## ETAPA 3 — Criar projeto no Railway (10 min)

1. Acesse https://railway.app
2. Clique em **New Project**
3. Selecione **Deploy from GitHub repo**
4. Autorize e selecione `Biz-Management-Follow---1`
5. Clique em **+ New** → **Database** → **MySQL**
6. Railway cria o MySQL e gera a `DATABASE_URL` automaticamente

### Variáveis de ambiente no Railway

No painel do projeto Railway → **Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | (Railway preenche automaticamente do MySQL) |
| `JWT_SECRET` | rode `openssl rand -base64 32` e cole o resultado |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

---

## ETAPA 4 — Importar banco no Railway (10 min)

Pegue as credenciais do MySQL criado no Railway (painel → MySQL → Connect) e preencha no script:

```bash
# Edite scripts/2-import-railway.sh com as credenciais do Railway
# Depois rode:
bash scripts/2-import-railway.sh
```

---

## ETAPA 5 — Deploy Frontend no Vercel (10 min)

1. Acesse https://vercel.com
2. Clique em **New Project**
3. Importe o mesmo repositório `Biz-Management-Follow---1`
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = URL do seu backend Railway (ex: `https://biz-backend.up.railway.app`)
5. Clique em **Deploy**

---

## ETAPA 6 — Testar antes de redirecionar (15 min)

Antes de mexer no domínio, teste pela URL temporária do Railway:

```
https://biz-backend.up.railway.app   ← backend
https://biz-frontend.vercel.app      ← frontend
```

Verifique:
- [ ] Login funciona
- [ ] Dados aparecem corretamente
- [ ] Smart Grid abre
- [ ] Negócios carregam

---

## ETAPA 7 — Redirecionar domínio bizmanapp.live (10 min)

Só faça isso depois de confirmar que tudo funciona na URL temporária.

### Opção A — Domínio apontando para o Railway (backend serve frontend)

No seu provedor de domínio (onde comprou `bizmanapp.live`):
- Aponte o registro `CNAME` ou `A` para o endereço do Railway

### Opção B — Domínio apontando para o Vercel (recomendado)

No painel Vercel → Settings → Domains:
- Adicione `bizmanapp.live`
- Siga as instruções de DNS que o Vercel exibe

No Vercel, a variável `VITE_API_URL` deve apontar para o Railway.

---

## ETAPA 8 — CI/CD ativo (automático após etapas anteriores)

Com o `.github/workflows/ci-cd.yml` criado, todo push na branch `main`:
1. Roda os 24 testes automaticamente
2. Se passar → deploy automático no Railway e Vercel
3. Se falhar → bloqueia o deploy e avisa

### Secrets necessários no GitHub

Repositório → Settings → Secrets → Actions:

| Secret | Onde pegar |
|--------|-----------|
| `RAILWAY_TOKEN` | Railway → Account → Tokens |
| `VERCEL_TOKEN` | Vercel → Account → Tokens |
| `VERCEL_ORG_ID` | `vercel env pull` ou painel Vercel |
| `VERCEL_PROJECT_ID` | `vercel env pull` ou painel Vercel |
| `DATABASE_URL_TEST` | Criar um banco de teste separado no Railway |

---

## Pós-migração — Segurança

Após tudo funcionando no Railway:

1. **Trocar senha do banco TiDB antigo** (ou simplesmente deletar o projeto no Manus)
2. **Trocar senhas padrão** dos usuários `superadmin`, `admin_org1`, `admin_org2`
3. **Gerar novo JWT_SECRET** diferente do atual

---

## Resumo dos comandos

```bash
# 1. Preparar código
bash scripts/3-prepare-migration.sh

# 2. Exportar banco
bash scripts/1-export-database.sh

# 3. Após criar MySQL no Railway, importar
bash scripts/2-import-railway.sh

# 4. Commit e push (CI/CD assume o resto)
git add -A
git commit -m "chore: migração para Railway + Vercel"
git push origin main
```
