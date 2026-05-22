import { useEffect, useState } from 'react'
import { storage } from '../lib/storage'
import KeywordsView from '@/ui/KeywordsView'

export default function KeywordsTab() {
  const [keywords, setKeywords] = useState<string[]>([])

  useEffect(() => {
    storage.getBlockedKeywords().then(setKeywords)
  }, [])

  const save = async (kws: string[]) => {
    setKeywords(kws)
    await storage.setBlockedKeywords(kws)
  }

  return (
    <KeywordsView
      keywords={keywords}
      onAdd={kw => save([...keywords, kw])}
      onRemove={kw => save(keywords.filter(k => k !== kw))}
    />
  )
}
