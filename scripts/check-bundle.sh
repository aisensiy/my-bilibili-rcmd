#!/usr/bin/env bash
# Verify the extension bundle stays clean after the ui/ + promo/ refactor.
# Run after `pnpm build`. Fails if:
#   1. Any extension code imports promo-only fixtures
#   2. The string 'fixtures' appears in dist/ (heuristic for leaked imports)
#   3. dist/ exceeds the agreed size budget
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Build clean
pnpm build >/dev/null

# 1. Source-level: extension/background/content must not import @/ui/fixtures
if rg -q "from ['\"]@/ui/fixtures" src/extension src/background src/content 2>/dev/null; then
  echo "❌ extension code imports @/ui/fixtures:" >&2
  rg "from ['\"]@/ui/fixtures" src/extension src/background src/content >&2
  exit 1
fi

# 2. Bundle-level: 'fixtures' substring should not appear in any dist artifact
if grep -rq "fixtures" dist/ 2>/dev/null; then
  echo "❌ string 'fixtures' leaked into dist/:" >&2
  grep -rl "fixtures" dist/ >&2
  exit 1
fi

# 3. Bundle size sanity check (basis: ~260K before refactor)
SIZE_KB=$(du -sk dist | awk '{print $1}')
MAX_KB=300  # +~15% tolerance over 260K baseline
if (( SIZE_KB > MAX_KB )); then
  echo "❌ dist/ size ${SIZE_KB}K exceeds budget ${MAX_KB}K" >&2
  exit 1
fi

echo "✓ extension bundle clean (${SIZE_KB}K, no fixtures leakage)"
