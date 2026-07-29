#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
CE="$ROOT/server/promts/creagic-engine"
cd "$CE"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
. .venv/bin/activate
if ! python -c "import uvicorn" 2>/dev/null; then
  pip install -r requirements-api.txt
fi

export PYTHONPATH=src
exec python -m uvicorn creagic.api_app:app --host 127.0.0.1 --port 5799
