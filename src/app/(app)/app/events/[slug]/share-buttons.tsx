'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link2, Check, Share2 } from 'lucide-react'
import { useScopedI18n } from '@/locales/client'

export function ShareButtons() {
  const t = useScopedI18n('eventDetail')
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const canShare = typeof window !== 'undefined' && !!navigator.share

  const share = async () => {
    try {
      await navigator.share({
        title: document.title,
        url: window.location.href,
      })
    } catch {}
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
        {copied ? <Check size={14} /> : <Link2 size={14} />}
        {copied ? t('copied') : t('copyLink')}
      </Button>
      {canShare && (
        <Button variant="outline" size="sm" className="gap-2" onClick={share}>
          <Share2 size={14} /> {t('share')}
        </Button>
      )}
    </div>
  )
}
