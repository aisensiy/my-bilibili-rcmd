#!/usr/bin/env bash
# Render a promo HTML file to a 1280x800 PNG using headless Chrome.
#
# Usage:
#   ./render.sh promo-history-insights.html
#   → writes screenshot-history-insights.png in the same directory
#
# Naming convention: promo-FOO.html  →  screenshot-FOO.png

set -euo pipefail

HTML="${1:?usage: ./render.sh <promo-file.html>}"
if [[ ! -f "$HTML" ]]; then
  echo "not found: $HTML" >&2
  exit 1
fi

DIR="$(cd "$(dirname "$HTML")" && pwd)"
BASE="$(basename "$HTML" .html)"
OUT_BASE="${BASE/#promo-/screenshot-}"
PNG="$DIR/$OUT_BASE.png"

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
  --screenshot="$PNG" \
  "file://$DIR/$(basename "$HTML")" \
  >/dev/null 2>&1

# Auto-compress the PNG (quantize to 256-color palette).
# Keeps it under Chrome Web Store's 1 MB per-screenshot guideline.
python3 - "$PNG" <<'PY'
import sys
from PIL import Image
path = sys.argv[1]
img = Image.open(path).convert("RGB")
img.quantize(colors=256).save(path, optimize=True)
PY

SIZE=$(ls -lh "$PNG" | awk '{print $5}')
echo "✓ $PNG  ($SIZE, 1280×800)"
