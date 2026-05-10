'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pb-[72px] sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full sm:max-w-lg glass-heavy rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up',
          className
        )}
      >
        {/* Top shine */}
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
            <h2 className="font-semibold text-base">{title}</h2>
            <button onClick={onClose} className="w-7 h-7 glass rounded-lg flex items-center justify-center text-white/35 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  )
}
