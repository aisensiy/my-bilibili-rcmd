import { useState } from 'react'

interface KeywordsViewProps {
  keywords: string[]
  onAdd?: (kw: string) => void
  onRemove?: (kw: string) => void
}

export default function KeywordsView({ keywords, onAdd, onRemove }: KeywordsViewProps) {
  const [input, setInput] = useState('')
  const editable = !!onAdd && !!onRemove

  const handleAdd = () => {
    if (!onAdd) return
    const v = input.trim()
    if (v && !keywords.includes(v)) onAdd(v)
    setInput('')
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="text-xs text-gray-500 mb-4 leading-relaxed">
        你手输的硬规则，AI 不会改动，立即生效。<br />
        适合屏蔽 AI 还没学到的临时热点（比如某个突发事件）。
      </div>

      {/* Input — editable mode only */}
      {editable && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="输入关键词，回车添加"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-hidden focus:border-bili-pink transition-colors"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: '#fb7299' }}
          >
            添加
          </button>
        </div>
      )}

      {/* Keyword list (or empty state) */}
      {keywords.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-8">暂无关键词</div>
      ) : (
        <div className="space-y-2">
          {keywords.map(kw => (
            <div
              key={kw}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5"
            >
              <span className="text-sm text-gray-700">{kw}</span>
              {editable && (
                <button
                  onClick={() => onRemove?.(kw)}
                  className="text-gray-400 hover:text-red-400 transition-colors text-sm ml-2"
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
