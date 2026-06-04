// src/promo/main.tsx
// Promo scene router:
//   - `/`                  → SceneIndex (clickable list of all scenes)
//   - `/?scene=<id>`       → that scene at 1280×800
//   - `/?scene=<unknown>`  → "not found" with the SceneIndex below
//
// Tailwind theme (bili-pink/bili-blue) comes from extension/index.css so the
// real PopupShell + view components render identically to the extension.
import { createRoot } from 'react-dom/client'
import HistoryInsights from './scenes/history-insights'
import FilterRecommendations from './scenes/filter-recommendations'
import KeywordsBlocking from './scenes/keywords-blocking'
import HotSearchBlock from './scenes/hot-search-block'
import MultiProvider from './scenes/multi-provider'
import PromoTile from './scenes/promo-tile'
import MarqueeBanner from './scenes/marquee-banner'
import PopularCoverage from './scenes/popular-coverage'
import '../extension/index.css'
// Imported AFTER index.css so its `body` font rule wins. Self-hosted OFL fonts
// keep store screenshots free of proprietary fonts — see fonts.css.
import './fonts.css'

interface SceneSpec {
  component: () => JSX.Element
  name: string
  description: string
}

const SCENES: Record<string, SceneSpec> = {
  'history-insights': {
    component: HistoryInsights,
    name: 'History Insights',
    description: '历史 + 完播率：扩展默默把用户在 B 站推荐流里看过的视频记下来',
  },
  'filter-recommendations': {
    component: FilterRecommendations,
    name: 'Filter Recommendations',
    description: '过滤推荐流：按 AI 兴趣画像 + 关键词自动屏蔽，加 hover 主动操作',
  },
  'popular-coverage': {
    component: PopularCoverage,
    name: 'Popular Coverage',
    description: '覆盖热门页：首页的过滤与「不感兴趣 / 不看TA」现在也作用于 /v/popular/all',
  },
  'keywords-blocking': {
    component: KeywordsBlocking,
    name: 'Keywords Blocking',
    description: '主动关键词屏蔽：手输词命中即隐藏，AI 不参与',
  },
  'hot-search-block': {
    component: HotSearchBlock,
    name: 'Hot Search Block',
    description: '动态页热搜「屏蔽话题」：点一下话题下榜并记成行为，喂给画像',
  },
  'multi-provider': {
    component: MultiProvider,
    name: 'Multi-Provider',
    description: '多供应商 + 自定义：OpenRouter / 智谱 / DeepSeek / 任意 OpenAI 兼容服务',
  },
  'promo-tile': {
    component: PromoTile,
    name: 'Promo Tile (440×280)',
    description: 'Chrome Web Store 小型宣传图块：极简品牌广告，小尺寸下能读清',
  },
  'marquee-banner': {
    component: MarqueeBanner,
    name: 'Marquee Banner (1400×560)',
    description: 'Chrome Web Store 顶部宣传图块：hero + 3 pills + 兴趣画像 popup',
  },
}

function SceneIndex({ unknown }: { unknown?: string }) {
  return (
    <div style={{
      maxWidth: 720,
      margin: '60px auto',
      padding: 24,
      fontFamily: '"Inter", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
      color: '#171b26',
    }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>Promo Scenes</h1>
      <p style={{ color: '#5f6878', fontSize: 14, lineHeight: 1.5, marginBottom: 28 }}>
        每张促销图是一个 React 场景，渲染目标 1280×800。点开任何一个，在 DevTools device toolbar
        里把视口缩到 1280×800 看效果；改 scene 文件或 fixtures 后会热更新。
        要出 PNG 走 <code style={{ fontFamily: 'monospace', background: '#f5f7fa', padding: '2px 6px', borderRadius: 4 }}>./docs/store-assets/render.sh &lt;name&gt;</code>。
      </p>
      {unknown && (
        <div style={{
          padding: '14px 18px',
          marginBottom: 24,
          borderRadius: 8,
          background: '#fff5f8',
          border: '1px solid #ffd5e1',
          color: '#9a1d4a',
          fontSize: 14,
        }}>
          没找到 scene <code style={{ fontFamily: 'monospace' }}>{unknown}</code>。
        </div>
      )}
      <div style={{ display: 'grid', gap: 14 }}>
        {Object.entries(SCENES).map(([id, spec]) => (
          <a
            key={id}
            href={`./?scene=${id}`}
            style={{
              display: 'block',
              padding: '18px 20px',
              border: '1px solid #e6eaf0',
              borderRadius: 12,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color .15s, box-shadow .15s',
              background: '#ffffff',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#fb7299'
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(251, 114, 153, 0.12)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e6eaf0'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{spec.name}</div>
              <code style={{ fontFamily: 'monospace', fontSize: 12, color: '#9aa3b2' }}>?scene={id}</code>
            </div>
            <div style={{ marginTop: 6, color: '#5f6878', fontSize: 14, lineHeight: 1.45 }}>
              {spec.description}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

const sceneParam = new URL(location.href).searchParams.get('scene')
const root = createRoot(document.getElementById('root')!)

if (!sceneParam) {
  root.render(<SceneIndex />)
} else {
  const spec = SCENES[sceneParam]
  if (spec) {
    const Scene = spec.component
    root.render(<Scene />)
  } else {
    root.render(<SceneIndex unknown={sceneParam} />)
  }
}
