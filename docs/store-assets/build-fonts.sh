#!/usr/bin/env bash
# Regenerate the self-hosted OPEN-SOURCE fonts used to render promo screenshots.
#
# Why this exists
# ---------------
# The store screenshots (docs/store-assets/*.png) bake glyphs into pixels. To
# keep them free of any proprietary-font licensing question (macOS would
# otherwise render the promo with Apple's San Francisco + 苹方 PingFang SC +
# SF Mono, whose licenses are scoped to Apple-platform work), we render with
# SIL OFL 1.1 fonts only:
#   - Inter          (Latin / UI)  -- github.com/rsms/inter
#   - Noto Sans SC   (Chinese)     -- github.com/notofonts/noto-cjk
#   - JetBrains Mono (monospace)   -- github.com/JetBrains/JetBrainsMono
#     (the ui/ Settings + Profile views render API keys / hashes in `font-mono`)
#
# Noto Sans CJK is ~30 MB, so we subset it down to exactly the glyphs that
# appear in src/ (promo scenes + the real ui/ components they render) plus an
# ASCII + full-width-punctuation baseline. The result is a tiny woff2.
#
# Outputs (committed under src/promo/fonts/):
#   Inter-variable.woff2          -- Latin, variable weight 100-900
#   NotoSansSC-subset.woff2       -- Chinese subset, variable weight 100-900
#   JetBrainsMono-variable.woff2  -- Latin monospace, variable weight
#   OFL-Inter.txt / OFL-NotoSansSC.txt / OFL-JetBrainsMono.txt -- licenses
#     (OFL requires the license text to ship alongside the fonts)
#
# Re-run after adding scenes with NEW Chinese characters, then re-render:
#   ./build-fonts.sh && ./render.sh <scene>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/src/promo/fonts"
mkdir -p "$OUT"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

INTER_WOFF2="https://cdn.jsdelivr.net/npm/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2"
MONO_WOFF2="https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2"
NOTO_VF="https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/OTF/NotoSansCJKsc-VF.otf"
INTER_LICENSE="https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt"
MONO_LICENSE="https://raw.githubusercontent.com/JetBrains/JetBrainsMono/master/OFL.txt"
NOTO_LICENSE="https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE"

echo "-> fonttools + brotli (isolated venv)"
python3 -m venv "$TMP/venv"
"$TMP/venv/bin/pip" install --quiet --disable-pip-version-check "fonttools>=4.0" brotli

echo "-> downloading sources"
curl -fsSL "$INTER_WOFF2"   -o "$OUT/Inter-variable.woff2"
curl -fsSL "$MONO_WOFF2"    -o "$OUT/JetBrainsMono-variable.woff2"
curl -fsSL "$NOTO_VF"       -o "$TMP/NotoSansCJKsc-VF.otf"
curl -fsSL "$INTER_LICENSE" -o "$OUT/OFL-Inter.txt"
curl -fsSL "$MONO_LICENSE"  -o "$OUT/OFL-JetBrainsMono.txt"
curl -fsSL "$NOTO_LICENSE"  -o "$OUT/OFL-NotoSansSC.txt"

echo "-> collecting glyphs used in src/"
python3 - "$ROOT" "$TMP/glyphs.txt" <<'PY'
import sys, glob, os
root, out = sys.argv[1], sys.argv[2]
chars = set()
for sub in ("src/promo", "src/ui"):
    for f in glob.glob(os.path.join(root, sub, "**", "*.ts*"), recursive=True):
        try:
            chars.update(open(f, encoding="utf-8").read())
        except Exception:
            pass
# Baseline so small copy tweaks don't force a re-subset:
chars.update(chr(c) for c in range(0x20, 0x7f))            # ASCII printable
chars.update("，。、；：？！「」『』（）【】《》—…·　％＋－０１２３４５６７８９")  # full-width punct/digits
text = "".join(sorted(c for c in chars if c == " " or c.strip()))
open(out, "w", encoding="utf-8").write(text)
print(f"   {len(text)} unique glyphs")
PY

echo "-> subsetting Noto Sans SC"
"$TMP/venv/bin/pyftsubset" "$TMP/NotoSansCJKsc-VF.otf" \
  --text-file="$TMP/glyphs.txt" \
  --output-file="$OUT/NotoSansSC-subset.woff2" \
  --flavor=woff2 \
  --layout-features='*' \
  --no-hinting \
  --desubroutinize \
  --name-IDs='*'

echo "OK fonts written to src/promo/fonts/"
ls -lh "$OUT"
