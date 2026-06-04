// src/promo/scenes/multi-provider.tsx
// 4th promo: 多供应商 + 自定义.
// Narrative: left = 4 provider options at a glance (highlighting custom);
//            right = actual SettingsView showing the same custom provider
//            currently configured (Base URL field visible → "兼容自部署"
//            is real, not a mock).
// SettingsView is rendered without callbacks → all controls effectively
// read-only (buttons disabled, inputs uncontrolled but value comes through).
import { useState } from 'react'

import Stage from '../components/layout/Stage'
import ProviderCompareCard from '../components/ProviderCompareCard'

import PopupShell from '@/ui/PopupShell'
import SettingsView from '@/ui/SettingsView'
import { demoSettings } from '@/ui/fixtures/settings'
import { PROVIDERS, type ProviderId } from '@/lib/providers'

const PROVIDER_IDS: ProviderId[] = ['openrouter', 'glm', 'deepseek', 'custom']

const COMPARE_CARDS: { id: ProviderId; badge: string; badgeColor: string; blurb: string; hint: string }[] = [
  { id: 'openrouter', badge: '国外',     badgeColor: '#0b93d7', blurb: '模型最全',       hint: 'GPT · Claude · Gemini 都有' },
  { id: 'glm',        badge: '国内',     badgeColor: '#2b9d6e', blurb: '低延迟',         hint: '例：GLM-5.1' },
  { id: 'deepseek',   badge: '国内',     badgeColor: '#2b9d6e', blurb: '便宜',           hint: '例：DeepSeek-V4-Flash' },
  { id: 'custom',     badge: '灵活',     badgeColor: '#fb7299', blurb: 'OpenAI 兼容入口', hint: 'longcat · Ollama · vLLM · One-API' },
]

export default function MultiProviderScene() {
  // SettingsView is fully controlled; promo passes a noop state setter for
  // showKey indirectly — SettingsView owns showKey internally, so no work
  // needed. We do need savedFlash and testStatus props; pass static idle.
  const [savedFlash] = useState(false)

  return (
    <Stage>
      {/* 顶部品牌区 + 右上隐私徽章 */}
      <div style={{
        position: 'absolute',
        top: 48, left: 79, right: 79,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 25, fontWeight: 800,
            boxShadow: '0 10px 24px rgba(251, 79, 134, 0.28)',
          }}>B</div>
          <div>
            <div style={{ fontSize: 27, lineHeight: 1.05, fontWeight: 700, color: '#171b26' }}>
              我的 Bilibili 推荐
            </div>
            <div style={{ marginTop: 8, fontSize: 18, lineHeight: 1.1, color: '#748094' }}>
              Chrome 扩展程序
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          height: 46, padding: '0 18px 0 14px',
          borderRadius: 999,
          background: 'linear-gradient(135deg, #09a9e7 0%, #0b93d7 100%)',
          color: '#ffffff', fontSize: 17, fontWeight: 400,
          boxShadow: '0 15px 28px rgba(0, 161, 214, 0.28)',
        }}>
          <svg width={28} height={28} viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16 3.5 26 7.3v7.8c0 6.2-4.2 11.8-10 13.4C10.2 26.9 6 21.3 6 15.1V7.3l10-3.8Z" fill="rgba(255,255,255,.96)"/>
            <path d="m12.2 15.9 2.4 2.5 5.5-6" fill="none" stroke="#129bdd" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          本地隐私生效
        </div>
      </div>

      {/* Hero 文案 */}
      <section style={{ position: 'absolute', left: 79, top: 155, zIndex: 3 }}>
        <h1 style={{ width: 720, fontSize: 56, lineHeight: 1.18, fontWeight: 500, color: '#171b26' }}>
          自带 Key，<span style={{ color: '#ff4f86' }}>多家任选</span>
        </h1>
        <p style={{ marginTop: 16, fontSize: 20, lineHeight: 1.4, fontWeight: 500, color: '#5e6677' }}>
          OpenRouter / 智谱 / DeepSeek / 自定义 OpenAI 兼容服务，按你的网络和钱包选
        </p>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: '#1b1d24',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>本地存 Key</div>
          <div style={{
            height: 46, padding: '0 23px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 22, fontWeight: 700, lineHeight: 1,
            background: 'linear-gradient(135deg, #fb7299 0%, #ff4f86 100%)',
            boxShadow: '0 12px 22px rgba(23, 27, 38, 0.12)',
          }}>OpenAI 兼容</div>
        </div>
      </section>

      {/* 左下：4-provider 比较面板（替代 browser frame；本场景没有"推荐流"叙事） */}
      <section style={{
        position: 'absolute',
        left: 43, bottom: 56,
        width: 740, height: 380,
        padding: '24px 28px',
        borderRadius: 12,
        background: '#ffffff',
        border: '1px solid #e6eaf0',
        boxShadow: '0 16px 28px rgba(22, 26, 34, 0.10)',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#171b26' }}>
            支持的 AI 提供商
          </div>
          <div style={{ fontSize: 12, color: '#9aa3b2' }}>
            你的 Key、你的钱包，切换无负担
          </div>
        </div>
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 14,
        }}>
          {COMPARE_CARDS.map(c => (
            <ProviderCompareCard
              key={c.id}
              name={PROVIDERS[c.id].label}
              badge={c.badge}
              badgeColor={c.badgeColor}
              blurb={c.blurb}
              hint={c.hint}
              active={c.id === demoSettings.activeProvider}
            />
          ))}
        </div>
      </section>

      {/* 右浮：真实 SettingsView（read-only — 无 callbacks） */}
      <aside style={{
        position: 'absolute',
        right: 79, top: 130,
        width: 389, height: 670,
        borderRadius: 8,
        overflow: 'hidden',
        background: 'white',
        border: '1px solid #e7ebf1',
        boxShadow: '0 18px 30px rgba(24, 30, 42, 0.18)',
        zIndex: 5,
      }}>
        <PopupShell active="settings" variant="popup">
          <SettingsView
            providers={PROVIDERS}
            providerIds={PROVIDER_IDS}
            settings={demoSettings}
            isDirty={false}
            savedFlash={savedFlash}
            isInTab={true}  /* hide the "弹窗会关闭" amber banner — promo viewer doesn't need it */
            testStatus="idle"
            testMsg=""
          />
        </PopupShell>
      </aside>
    </Stage>
  )
}
