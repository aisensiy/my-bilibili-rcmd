// src/promo/scenes/promo-tile.tsx
// Chrome Web Store 小型宣传图块 — 440×280.
// Pure brand billboard: B logo + name + Chrome subtitle + one-line tagline.
// No product UI (would be unreadable at this size).
import Stage from '../components/layout/Stage'

export default function PromoTileScene() {
  return (
    <Stage width={440} height={280}>
      {/* Brand block — centered vertically, slightly left of center */}
      <div style={{
        position: 'absolute',
        left: 32, top: 78,
        display: 'flex', alignItems: 'center', gap: 18,
        zIndex: 4,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, fontWeight: 900,
          boxShadow: '0 12px 24px rgba(251, 79, 134, 0.32)',
        }}>B</div>
        <div>
          <div style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800, color: '#171b26' }}>
            我的 Bilibili 推荐
          </div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.1, color: '#748094' }}>
            Chrome 扩展程序
          </div>
        </div>
      </div>

      {/* Tagline — bottom band */}
      <div style={{
        position: 'absolute',
        left: 32, right: 32, bottom: 38,
        fontSize: 18, fontWeight: 800, lineHeight: 1.25,
        color: '#171b26',
        zIndex: 4,
      }}>
        让 AI <span style={{ color: '#ff4f86' }}>帮你刷</span> B 站
      </div>
    </Stage>
  )
}
