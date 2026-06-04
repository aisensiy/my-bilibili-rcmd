// src/promo/scenes/promo-tile.tsx
// Chrome Web Store 小型宣传图块 — 440×280.
// Pure brand billboard: B logo + name + Chrome subtitle + one-line tagline.
// No product UI (would be unreadable at this size).
//
// Font sizing principle: this tile gets DOWNSCALED again in Chrome Web Store
// listings (browse pages, search results), so every typographic decision
// should be made for "still readable at half size". Tagline is the loudest
// element since it's the only call-to-action; brand block is supporting.
import Stage from '../components/layout/Stage'

export default function PromoTileScene() {
  return (
    <Stage width={440} height={280}>
      {/* Brand block — upper area, slightly left of center */}
      <div style={{
        position: 'absolute',
        left: 32, top: 56,
        display: 'flex', alignItems: 'center', gap: 18,
        zIndex: 4,
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: 16,
          background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, fontWeight: 800,
          boxShadow: '0 12px 24px rgba(251, 79, 134, 0.32)',
        }}>B</div>
        <div>
          <div style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 700, color: '#171b26' }}>
            我的 Bilibili 推荐
          </div>
          <div style={{ marginTop: 7, fontSize: 15, lineHeight: 1.1, color: '#748094' }}>
            Chrome 扩展程序
          </div>
        </div>
      </div>

      {/* Tagline — bottom band, loudest text on the tile */}
      <div style={{
        position: 'absolute',
        left: 32, right: 32, bottom: 36,
        fontSize: 28, fontWeight: 800, lineHeight: 1.2,
        color: '#171b26',
        zIndex: 4,
      }}>
        让 B 站推荐 <span style={{ color: '#ff4f86' }}>听你的</span>
      </div>
    </Stage>
  )
}
