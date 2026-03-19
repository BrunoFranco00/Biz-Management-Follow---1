#!/bin/bash
# ============================================================
# PASSO 2 — Importar banco no Railway MySQL
# Execute: bash scripts/2-import-railway.sh
# ANTES: Preencha a RAILWAY_DB_URL com a URL do Railway
# ============================================================

set -e

# ⚠️  Cole aqui a DATABASE_URL do MySQL que o Railway vai gerar
RAILWAY_HOST=""
RAILWAY_PORT="3306"
RAILWAY_USER=""
RAILWAY_PASSWORD=""
RAILWAY_DATABASE=""

BACKUP_FILE=$(ls backup-*.sql 2>/dev/null | sort | tail -1)

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Nenhum arquivo backup-*.sql encontrado."
  echo "   Rode primeiro: bash scripts/1-export-database.sh"
  exit 1
fi

if [ -z "$RAILWAY_HOST" ]; then
  echo "❌ Preencha as variáveis RAILWAY_* no início deste script antes de rodar."
  exit 1
fi

echo "📥 Importando $BACKUP_FILE no Railway MySQL..."

mysql \
  --host=$RAILWAY_HOST \
  --port=$RAILWAY_PORT \
  --user=$RAILWAY_USER \
  --password=$RAILWAY_PASSWORD \
  $RAILWAY_DATABASE < $BACKUP_FILE

echo "✅ Importação concluída!"
echo ""
echo "Próximo passo: configure as variáveis de ambiente no Railway (veja docs/railway-env-vars.md)"
