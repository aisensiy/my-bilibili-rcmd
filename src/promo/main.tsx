// src/promo/main.tsx
// Promo scene router: ?scene=<id> selects which scene to render.
// Tailwind theme (bili-pink/bili-blue) comes from extension/index.css — reuse it
// so the popup the promo renders looks identical to the real extension.
import { createRoot } from 'react-dom/client'
import HistoryInsights from './scenes/history-insights'
import '../extension/index.css'

const SCENES = {
  'history-insights': HistoryInsights,
} as const

type SceneId = keyof typeof SCENES

const sceneParam = new URL(location.href).searchParams.get('scene') ?? 'history-insights'
const Scene = (SCENES as Record<string, typeof HistoryInsights | undefined>)[sceneParam]

const root = createRoot(document.getElementById('root')!)
root.render(
  Scene
    ? <Scene />
    : (
      <div style={{ padding: 24, fontFamily: 'monospace' }}>
        Unknown scene: <strong>{sceneParam}</strong>
        <br />
        Available: {Object.keys(SCENES).join(', ')}
      </div>
    )
)
