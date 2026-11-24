'use client'

import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function EventSearchBar({
  defaultValue = '',
  placeholder,
  buttonLabel,
}: {
  defaultValue?: string
  placeholder: string
  buttonLabel: string
}) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    setValue('')
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
      // Submit the form to clear search results immediately
      inputRef.current.form?.requestSubmit()
    }
  }

  return (
    <div className="flex gap-3 p-1.5 rounded-[8px] bg-alpine-50/70 dark:bg-slate-900 border border-alpine-500/35 shadow-card">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
        <Input
          ref={inputRef}
          name="q"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-10 pr-10 h-11 rounded-[4px] border-alpine-500/25 bg-white dark:bg-slate-800 text-sm focus-visible:ring-1 focus-visible:ring-alpine-600 transition-all shadow-xs"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <Button
        type="submit"
        size="default"
        className="rounded-[4px] px-6 h-11 bg-alpine-600 hover:bg-alpine-700 text-white font-mono text-xs uppercase tracking-wider shadow-sm shrink-0"
      >
        {buttonLabel}
      </Button>
    </div>
  )
}
