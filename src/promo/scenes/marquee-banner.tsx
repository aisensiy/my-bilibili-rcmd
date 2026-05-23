// src/promo/scenes/marquee-banner.tsx
// Chrome Web Store 顶部宣传图块 — 1400×560.
// Marquee banner: left half = hero tagline + sub + 3 feature pills;
// right half = real PopupShell + ProfileView (兴趣画像 tab) at full popup size.
import Stage from '../components/layout/Stage'
import PopupShell from '@/ui/PopupShell'
import ProfileView from '@/ui/ProfileView'
import { demoProfile } from '@/ui/fixtures/profile'

export default function MarqueeBannerScene() {
  return (
    <Stage width={1400} height={560}>
      {/* Brand row top-left */}
      <div style={{
        position: 'absolute',
        top: 38, left: 60,
        display: 'flex', alignItems: 'center', gap: 16,
        zIndex: 4,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900,
          boxShadow: '0 8px 18px rgba(251, 79, 134, 0.28)',
        }}>B</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#171b26' }}>
          我的 Bilibili 推荐 · Chrome 扩展
        </div>
      </div>

      {/* Hero block left-center */}
      <section style={{ position: 'absolute', left: 60, top: 140, zIndex: 3 }}>
        <h1 style={{ width: 760, fontSize: 64, lineHeight: 1.15, fontWeight: 900, color: '#171b26' }}>
          你的 B 站，<span style={{ color: '#ff4f86' }}>由你做主</span>
        </h1>
        <p style={{ marginTop: 18, width: 760, fontSize: 22, lineHeight: 1.45, fontWeight: 600, color: '#5e6677' }}>
          关键词屏蔽、AI 兴趣画像、本地观看历史 —— 三道手段全部本地生效，自带 Key
        </p>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: '关键词屏蔽', dark: true },
            { label: 'AI 画像', dark: false },
            { label: '本地历史', dark: true },
          ].map(({ label, dark }) => (
            <div key={label} style={{
              height: 44, padding: '0 22px', borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 18, fontWeight: 800, lineHeight: 1,
              background: dark
                ? '#1b1d24'
                : 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
              boxShadow: '0 10px 20px rgba(23, 27, 38, 0.12)',
            }}>{label}</div>
          ))}
        </div>
      </section>

      {/* Real popup on the right — ProfileView with demoProfile */}
      <aside style={{
        position: 'absolute',
        right: 80, top: 40,
        width: 380, height: 480,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'white',
        border: '1px solid #e7ebf1',
        boxShadow: '0 22px 38px rgba(24, 30, 42, 0.22)',
        zIndex: 5,
      }}>
        <PopupShell active="profile" variant="popup">
          <ProfileView profile={demoProfile} />
        </PopupShell>
      </aside>
    </Stage>
  )
}
