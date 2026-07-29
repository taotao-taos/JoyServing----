#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

for port in 3000 3847 5799; do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null) || true
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done
done

exec ./node_modules/.bin/concurrently -k \
  "npm run creagic:api" \
  "npm run server" \
  "npm run dev"
