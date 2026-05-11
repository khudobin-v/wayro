'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  detail?: string
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, detail?: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success', detail?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type, detail }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-xs w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 rounded-2xl animate-slide-up glass-heavy',
              t.type === 'success' && 'border border-accent/20',
              t.type === 'error' && 'border border-danger/20',
              t.type === 'info' && 'border border-info/20'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.message}</p>
              {t.detail && <p className="text-xs text-gray-500 mt-0.5">{t.detail}</p>}
            </div>
            <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-900 flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
