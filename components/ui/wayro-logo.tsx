export function WayroLogo({ size = 32 }: { size?: number }) {
  const fontSize = Math.round(size * 1.1)
  return (
    <span
      style={{
        fontSize,
        lineHeight: 1,
        fontWeight: 800,
        letterSpacing: '-0.04em',
        background: 'linear-gradient(135deg, #4ADE80 0%, #22d3ee 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
        fontFamily: 'inherit',
      }}
    >
      W
    </span>
  )
}

export function WayroWordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <WayroLogo size={26} />
      <span className="font-bold text-base tracking-tight">Wayro</span>
    </div>
  )
}
