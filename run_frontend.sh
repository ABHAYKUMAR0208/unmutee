#!/bin/bash
set -ex
source /unmute/.env
cd /unmute/frontend
export NEXT_PUBLIC_BACKEND_URL=https://$(hostname)-8000.proxy.runpod.net
pnpm install
pnpm build
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
