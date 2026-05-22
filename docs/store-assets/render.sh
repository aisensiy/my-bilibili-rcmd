#!/usr/bin/env bash
# Render a promo scene to a PNG using headless Chrome.
#
# Usage:
#   ./render.sh history-insights
#   → builds dist-promo/ then writes screenshot-history-insights.png
#
# Window dimensions per scene:
#   promo-tile        → 440×280   (Chrome Web Store 小型宣传图块)
#   marquee-banner    → 1400×560  (Chrome Web Store 顶部宣传图块)
#   everything else   → 1280×800  (Chrome Web Store 截图)
set -euo pipefail

SCENE="${1:?usage: ./render.sh <scene-name>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/docs/store-assets/screenshot-${SCENE}.png"

case "$SCENE" in
  promo-tile)     W=440;  H=280 ;;
  marquee-banner) W=1400; H=560 ;;
  *)              W=1280; H=800 ;;
esac

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
  --window-size=$W,$H \
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
DIM=$(python3 -c "from PIL import Image; print('×'.join(map(str, Image.open('$OUT').size)))")
echo "✓ $OUT  ($SIZE, $DIM)"
