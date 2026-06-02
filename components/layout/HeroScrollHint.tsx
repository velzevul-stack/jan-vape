'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HeroScrollHint() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 60) setVisible(false)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToCatalog = () => {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <button
      type="button"
      onClick={scrollToCatalog}
      aria-label="Прокрутить к каталогу"
      className={cn(
        'mt-4 flex w-full flex-col items-center gap-1 transition-opacity duration-500 sm:mt-5 lg:hidden',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-text-muted">
        Каталог ниже
      </span>
      <ChevronDown className="h-5 w-5 animate-bounce text-accent-primary" />
    </button>
  )
}
