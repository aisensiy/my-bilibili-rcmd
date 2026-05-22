// src/promo/components/ProviderCompareCard.tsx
// One card in the multi-provider scene's 2×2 left panel.
// Highlighted when this card's provider matches what's "active" in the promo
// popup — visually mirrors the bili-pink switcher button style from
// SettingsView's provider row.

export interface ProviderCompareCardProps {
  name: string
  /** small badge text top-right, e.g. "国外" / "国内" / "灵活" */
  badge: string
  badgeColor: string
  /** one-line capability summary */
  blurb: string
  /** one-line detail (model examples or sample services) */
  hint: string
  /** Active = visually highlighted, mirrors PROVIDERS row's selected style */
  active?: boolean
}

export default function ProviderCompareCard({
  name, badge, badgeColor, blurb, hint, active,
}: ProviderCompareCardProps) {
  return (
    <div style={{
      padding: '18px 20px',
      borderRadius: 12,
      border: `2px solid ${active ? '#fb7299' : '#e6eaf0'}`,
      background: active ? '#fff5f8' : '#ffffff',
      boxShadow: active ? '0 8px 18px rgba(251, 114, 153, 0.16)' : '0 2px 6px rgba(22, 26, 34, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          color: active ? '#ff4f86' : '#171b26',
          lineHeight: 1.1,
        }}>{name}</div>
        <div style={{
          padding: '3px 9px',
          borderRadius: 999,
          background: badgeColor,
          color: '#ffffff',
          fontSize: 11,
          fontWeight: 700,
        }}>{badge}</div>
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 700,
        color: '#374151',
        lineHeight: 1.3,
      }}>{blurb}</div>
      <div style={{
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 1.4,
      }}>{hint}</div>
    </div>
  )
}
