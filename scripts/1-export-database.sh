#!/bin/bash
# ============================================================
# PASSO 1 — Exportar banco do TiDB (Manus)
# Execute: bash scripts/1-export-database.sh
# ============================================================

set -e

DB_URL="mysql://4MnEf7aH6itRRBg.91faba616815:wkdP1s8CJQ3lHvX520SI@gateway02.us-east-1.prod.aws.tidbcloud.com:4000/SCyBrKNBmddHHbUYUj7tm2?ssl={\"rejectUnauthorized\":true}"

HOST="gateway02.us-east-1.prod.aws.tidbcloud.com"
PORT="4000"
USER="4MnEf7aH6itRRBg.91faba616815"
PASSWORD="wkdP1s8CJQ3lHvX520SI"
DATABASE="SCyBrKNBmddHHbUYUj7tm2"
OUTPUT="backup-$(date +%Y%m%d-%H%M%S).sql"

echo "🔄 Exportando banco de dados do TiDB..."

mysqldump \
  --host=$HOST \
  --port=$PORT \
  --user=$USER \
  --password=$PASSWORD \
  --ssl-mode=REQUIRED \
  --no-tablespaces \
  --routines \
  --triggers \
  $DATABASE > $OUTPUT

echo "✅ Backup salvo em: $OUTPUT"
echo "📦 Tamanho: $(du -sh $OUTPUT | cut -f1)"
echo ""
echo "Próximo passo: rode scripts/2-import-railway.sh após criar o MySQL no Railway"
