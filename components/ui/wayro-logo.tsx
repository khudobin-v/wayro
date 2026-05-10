'use client'

import { useId } from 'react'

export function WayroLogo({ size = 32 }: { size?: number }) {
  const id = useId().replace(/:/g, '')
  const arrowId = `arrow-${id}`
  const glowId  = `glow-${id}`

  return (
    <svg width={size} height={size} viewBox="0 0 52 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={arrowId} x1="25" y1="16" x2="46" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#F97316" />
          <stop offset="100%" stopColor="#FCD34D" />
        </linearGradient>
        <linearGradient id={glowId} x1="2" y1="14" x2="50" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.95)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
        </linearGradient>
      </defs>

      {/* W — subtle glow layer */}
      <path
        d="M2 14 C4 14 8 42 16 42 C21 42 23 22 26 16 C29 10 31 42 36 42 C44 42 48 14 50 14"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* W — main stroke */}
      <path
        d="M2 14 C4 14 8 42 16 42 C21 42 23 22 26 16 C29 10 31 42 36 42 C44 42 48 14 50 14"
        stroke={`url(#${glowId})`}
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arrow shaft — from W centre peak to arrowhead base */}
      <line
        x1="26" y1="16"
        x2="38" y2="7"
        stroke={`url(#${arrowId})`}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Arrow head — filled triangle pointing upper-right */}
      <polygon
        points="47,3 38,7 42,15"
        fill={`url(#${arrowId})`}
      />
    </svg>
  )
}

export function WayroWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <WayroLogo size={30} />
      <span className="font-bold text-base tracking-tight">Wayro</span>
    </div>
  )
}
