#!/bin/bash
# ============================================================
# SCRIPT DE MIGRAÇÃO — Remove Manus, prepara para Railway+Vercel
# Execute dentro da pasta do projeto:
# bash scripts/3-prepare-migration.sh
# ============================================================

set -e

PROJECT_DIR="/Users/bruno/Biz-Management-Follow---1"
cd "$PROJECT_DIR"

echo "🚀 Iniciando preparação para migração Railway + Vercel..."
echo ""

# --- 1. Remover dependência do Manus do package.json ---
echo "📦 Removendo dependência vite-plugin-manus-runtime..."
pnpm remove vite-plugin-manus-runtime 2>/dev/null || true

# --- 2. Substituir vite.config.ts ---
echo "⚙️  Atualizando vite.config.ts (removendo plugins Manus)..."
cat > vite.config.ts << 'EOF'
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/trpc": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
EOF

# --- 3. Criar railway.json ---
echo "🚂 Criando railway.json..."
cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install -g pnpm && pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

# --- 4. Criar vercel.json ---
echo "▲  Criando vercel.json..."
cat > vercel.json << 'EOF'
{
  "buildCommand": "npm install -g pnpm && pnpm install && pnpm build",
  "outputDirectory": "dist/public",
  "framework": null,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
EOF

# --- 5. Criar .env.example ---
echo "🔐 Criando .env.example..."
cat > .env.example << 'EOF'
# Banco de dados Railway MySQL
DATABASE_URL=mysql://usuario:senha@host:3306/railway

# JWT Secret — gere com: openssl rand -base64 32
JWT_SECRET=TROQUE_POR_UM_SEGREDO_FORTE

# Porta
PORT=3000
NODE_ENV=production
EOF

# --- 6. Criar pasta GitHub Actions ---
echo "⚡ Criando pipeline CI/CD..."
mkdir -p .github/workflows
cat > .github/workflows/ci-cd.yml << 'EOF'
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm check
      - run: pnpm test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
          JWT_SECRET: ci-test-secret
EOF

# --- 7. Limpar README (remover senhas) ---
echo "🔒 Removendo senhas do README.md..."
sed -i '' 's/| `superadmin` | `Biz@102030`.*$/| `superadmin` | `[ver .env]` | Super Admin | — |/' README.md 2>/dev/null || true
sed -i '' 's/| `admin_org1` | `Biz@102030`.*$/| `admin_org1` | `[ver .env]` | Admin | Clinica GAMA |/' README.md 2>/dev/null || true
sed -i '' 's/| `admin_org2` | `Biz@102030`.*$/| `admin_org2` | `[ver .env]` | Admin | BFAGRO |/' README.md 2>/dev/null || true
sed -i '' 's/| `User1` | `Biz@102030`.*$/| `User1` | `[ver .env]` | Usuário | (por org) |/' README.md 2>/dev/null || true

# --- 8. Verificar build ---
echo ""
echo "🔨 Testando build..."
pnpm build 2>&1 | tail -5

echo ""
echo "============================================"
echo "✅ Preparação concluída! Próximos passos:"
echo "============================================"
echo ""
echo "1. EXPORTAR BANCO:"
echo "   bash scripts/1-export-database.sh"
echo ""
echo "2. CRIAR SERVIÇOS:"
echo "   • Railway: railway.app → New Project → Deploy from GitHub"
echo "   • Adicionar MySQL: + New → Database → MySQL"
echo "   • Vercel: vercel.com → New Project → importar mesmo repo"
echo ""
echo "3. CONFIGURAR VARIÁVEIS no Railway:"
echo "   DATABASE_URL = (gerada automaticamente pelo MySQL do Railway)"
echo "   JWT_SECRET   = (rode: openssl rand -base64 32)"
echo "   PORT         = 3000"
echo ""
echo "4. IMPORTAR BANCO:"
echo "   bash scripts/2-import-railway.sh"
echo ""
echo "5. REDIRECIONAR DOMÍNIO:"
echo "   bizmanapp.live → apontar para Railway"
echo ""
echo "📖 Veja o guia completo em: docs/migration-guide.md"
