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
# Clean previous build artifacts
rm -rf .next/standalone

pnpm build:deploy

echo ""
echo "📂 Verifying and assembling standalone output..."
pnpm build:standalone

# Handle case where outputFileTracing creates nested server.js
if [ ! -f .next/standalone/server.js ]; then
  NESTED_SERVER=$(find .next/standalone -name "server.js" | head -n 1)
  if [ -n "$NESTED_SERVER" ]; then
    echo "⚠️  Found nested server.js at $NESTED_SERVER, copying to .next/standalone/server.js"
    cp "$NESTED_SERVER" .next/standalone/server.js
  else
    echo "❌ .next/standalone/server.js not found after build!"
    exit 1
  fi
fi

echo ""
echo "📡 Syncing build to server (protecting VPS sharp, media, and secrets)..."
# NOTE: never sync standalone public/media — prod uploads live ONLY in
# $REMOTE_PATH/public/media (pinned via PAYLOAD_MEDIA_DIR). Syncing or
# deleting it here once wiped weeks of uploads. The server re-links it below.
rm -rf .next/standalone/public/media
rsync -az --delete \
  --exclude 'node_modules/sharp' \
  --exclude 'node_modules/@img' \
  --exclude '.env*' \
  --exclude '*.p8' \
  --exclude 'serviceAccountKey.json' \
  --exclude 'public/media' \
  .next/standalone/ "$SERVER:$REMOTE_PATH/.next/standalone/"

rsync -az .next/static/ "$SERVER:$REMOTE_PATH/.next/standalone/.next/static/"

rsync -az --delete \
  --exclude 'media' \
  public/ "$SERVER:$REMOTE_PATH/.next/standalone/public/"

echo ""
echo "🚀 Configuring and deploying on server..."
ssh "$SERVER" bash -s <<'EOF'
  set -euo pipefail
  cd /var/www/vhosts/afnoevents.co.uk
  source ~/.nvm/nvm.sh

  echo "🔑 Ensuring secrets in standalone..."
  [ -f .env ] && cp .env .next/standalone/.env
  [ -f AuthKey.p8 ] && cp AuthKey.p8 .next/standalone/AuthKey.p8
  [ -f serviceAccountKey.json ] && cp serviceAccountKey.json .next/standalone/serviceAccountKey.json
  # Uploads must resolve outside standalone regardless of process CWD.
  grep -q "^PAYLOAD_MEDIA_DIR=" .next/standalone/.env || {
    echo "❌ PAYLOAD_MEDIA_DIR missing in standalone .env — aborting (uploads would go nowhere)"
    exit 1
  }

  echo "🖼️  Ensuring media directories..."
  mkdir -p public/media
  # rm first: ln -sfn against an existing REAL dir creates the link inside it
  # instead of replacing it (this silently broke uploads before).
  rm -rf .next/standalone/public/media
  ln -sfn /var/www/vhosts/afnoevents.co.uk/public/media .next/standalone/public/media
  mkdir -p /Users/aayurtshrestha/projects/self/AfnoEvent/server/public
  ln -sfn /var/www/vhosts/afnoevents.co.uk/public/media /Users/aayurtshrestha/projects/self/AfnoEvent/server/public/media

  echo "📦 Ensuring VPS Linux sharp in standalone..."
  # NOTE: server node_modules is pnpm symlinks — plain `cp -r` produces a
  # dangling link and `cp -rL` orphans sharp from its .pnpm-store deps
  # (semver, ...). Symlink instead so resolution flows through the real tree.
  mkdir -p .next/standalone/node_modules
  rm -rf .next/standalone/node_modules/sharp .next/standalone/node_modules/@img
  if [ -d node_modules/sharp ]; then
    ln -sfn /var/www/vhosts/afnoevents.co.uk/node_modules/sharp .next/standalone/node_modules/sharp
  fi
  if [ -d node_modules/@img ]; then
    ln -sfn /var/www/vhosts/afnoevents.co.uk/node_modules/@img .next/standalone/node_modules/@img
  fi

  echo "🧪 Verifying sharp loads in standalone..."
  node -e "
    try {
      const s = require('/var/www/vhosts/afnoevents.co.uk/.next/standalone/node_modules/sharp');
      console.log('✅ Sharp verified in standalone:', s.versions.sharp);
    } catch(e) {
      console.warn('Fallback test with root sharp:', e.message);
      const s = require('/var/www/vhosts/afnoevents.co.uk/node_modules/sharp');
      console.log('✅ Sharp verified from root:', s.versions.sharp);
    }
  "

  echo "🔄 Restarting PM2 process..."
  pm2 reload multi-tenant-portfolio --update-env || pm2 restart multi-tenant-portfolio || pm2 start ecosystem.config.cjs
  pm2 save

  echo "⏳ Waiting for app to come up..."
  sleep 5
  CODE="000"
  for i in 1 2 3 4 5 6 7 8; do
    CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/ || true)
    [ "$CODE" = "200" ] && break
    sleep 3
  done
  echo "ℹ️  http://localhost:8080 → HTTP $CODE"
  [ "$CODE" = "200" ] || { echo "❌ App not healthy after restart (HTTP $CODE) — check pm2 logs"; exit 1; }

  echo "✅ Deploy complete!"
EOF

echo ""
echo "🎉 Done: https://afnoevents.co.uk"