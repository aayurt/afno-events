#!/bin/bash
# build-local.sh — build AfnoEvents server locally (staging Mac), rsync to prod, restart PM2.
#
# Builds .next/standalone locally (staging Mac), rsyncs it to prod, restarts PM2,
# and health-checks http://localhost:8080. Build failure aborts before touching the server.
# Prerendering uses the staging .env DB — the same Neon DB prod uses.

set -euo pipefail

SERVER="root@82.165.181.153"
REMOTE_PATH="/var/www/vhosts/afnoevents.co.uk"
cd "$(dirname "$0")"

# --- 0. sanity ---
if [ ! -f .env ]; then
  echo "❌ .env not found — cannot build (prerendering needs DATABASE_URI)."
  exit 1
fi

echo "🏗️  Building Next.js locally..."
# build:deploy = next build (uses .env) + assemble standalone dir.
# The staging Mac .env points at the same Neon DB prod uses, so prerendering works
# and matches prod content. Build failure aborts BEFORE anything touches the server.
pnpm build:deploy

echo ""
echo "📂 Assembling standalone output..."
pnpm build:standalone

echo ""
echo "📡 Syncing build to server..."
rsync -az --delete .next/standalone/ "$SERVER:$REMOTE_PATH/.next/standalone/"
rsync -az .next/static/ "$SERVER:$REMOTE_PATH/.next/standalone/.next/static/"
rsync -az --delete public/ "$SERVER:$REMOTE_PATH/.next/standalone/public/"

echo ""
echo "🚀 Deploying on server..."
ssh "$SERVER" bash -s <<'EOF'
  cd /var/www/vhosts/afnoevents.co.uk
  source ~/.nvm/nvm.sh

  echo "📦 Rebuilding native modules (sharp)..."
  pnpm rebuild:native

  echo "🔄 Restarting PM2..."
  pm2 delete multi-tenant-portfolio >/dev/null 2>&1 || true
  pm2 start ecosystem.config.cjs
  pm2 save

  echo "⏳ Waiting for app to come up..."
  sleep 5
  for i in 1 2 3 4 5 6; do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ || true)
    [ "$CODE" = "200" ] && break
    sleep 3
  done
  echo "ℹ️  http://localhost:8080 → HTTP $CODE"
  [ "$CODE" = "200" ] || { echo "❌ App not healthy after restart — check pm2 logs"; exit 1; }

  echo "✅ Deploy complete!"
EOF

echo ""
echo "🎉 Done: https://afnoevents.co.uk"
