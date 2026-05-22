#!/usr/bin/env bash
# Render a promo scene to a 1280x800 PNG using headless Chrome.
#
# Usage:
#   ./render.sh history-insights
#   → builds dist-promo/ then writes screenshot-history-insights.png
#
# Scenes are React components under src/promo/scenes/<scene>.tsx,
# selected via ?scene=<name> query param. With vite.config.promo.ts using
# `root: 'src/promo'` and `base: './'`, dist-promo/index.html opens
# straight from a file:// URL — no helper HTTP server needed.
set -euo pipefail

SCENE="${1:?usage: ./render.sh <scene-name>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/store-assets/screenshot-${SCENE}.png"

# 1. Build promo subapp (re-bundles scene + ui changes)
(cd "$ROOT" && pnpm build:promo >/dev/null)

# 2. Headless Chrome render + screenshot
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x "$CHROME" ]]; then
  echo "Chrome not found at $CHROME — adjust the path or install Chrome." >&2
  exit 1
fi

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --window-size=1280,800 \
  --virtual-time-budget=5000 \
  --allow-file-access-from-files \
  --disable-web-security \
  --user-data-dir=/tmp/chrome-promo-render \
  --screenshot="$OUT" \
  "file://$ROOT/dist-promo/index.html?scene=${SCENE}" \
  >/dev/null 2>&1

# 3. Compress (quantize to 256-color palette) — Chrome Web Store wants ≤ 1 MB
python3 - "$OUT" <<'PY'
import sys
from PIL import Image
img = Image.open(sys.argv[1]).convert("RGB")
img.quantize(colors=256).save(sys.argv[1], optimize=True)
PY

SIZE=$(ls -lh "$OUT" | awk '{print $5}')
echo "✓ $OUT  ($SIZE, 1280×800)"
