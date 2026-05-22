// src/ui/TagList.tsx
import { useState } from 'react'

interface TagListProps {
  label: string
  hint: string
  color: string
  tags: string[]
  onAdd?: (tag: string) => void
  onRemove?: (tag: string) => void
}

export default function TagList({ label, hint, color, tags, onAdd, onRemove }: TagListProps) {
  const [input, setInput] = useState('')
  const editable = !!onAdd && !!onRemove

  const handleAdd = () => {
    if (!onAdd) return
    const v = input.trim()
    if (v && !tags.includes(v)) { onAdd(v); setInput('') }
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <p className="text-[10px] text-gray-400 mb-2 leading-relaxed">{hint}</p>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {tags.length === 0 && (
          <span className="text-xs text-gray-400 italic">暂无</span>
        )}
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
            style={{ background: color }}
          >
            {tag}
            {editable && (
              <button
                onClick={() => onRemove?.(tag)}
                className="ml-0.5 opacity-70 hover:opacity-100 leading-none"
              >×</button>
            )}
          </span>
        ))}
      </div>
      {editable && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="输入标签回车添加"
            className="flex-1 text-xs border border-gray-200 rounded-sm px-2 py-1 outline-hidden focus:border-gray-400"
          />
          <button
            onClick={handleAdd}
            className="text-xs px-2 py-1 rounded-sm text-white"
            style={{ background: color }}
          >+</button>
        </div>
      )}
    </div>
  )
}
