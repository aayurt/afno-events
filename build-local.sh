#!/bin/bash
set -e

SERVER="root@82.165.181.153"
REMOTE_PATH="/var/www/vhosts/afnoevents.co.uk"

echo "🏗️ Building Next.js locally..."
cd "$(dirname "$0")"
pnpm build:deploy

echo ""
echo "📡 Syncing build to server..."
rsync -avz --progress .next/ "$SERVER:$REMOTE_PATH/.next/"

echo ""
echo "🚀 Deploying on server..."
ssh "$SERVER" "bash -c '
  cd $REMOTE_PATH
  source ~/.nvm/nvm.sh

  echo \"📦 Rebuilding native modules...\"
  pnpm rebuild:native

  echo \"🔄 Restarting PM2...\"
  pm2 delete ecosystem.config.cjs || true
  pm2 start ecosystem.config.cjs
  pm2 save

  echo \"✅ Deploy complete!\"
'"
