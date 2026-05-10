import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('rounded-xl relative overflow-hidden', className)}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      {/* Main metric */}
      <Skeleton className="h-36 rounded-3xl" />
      {/* Metric cards */}
      <div className="flex gap-2.5 overflow-hidden">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-32 flex-shrink-0 rounded-2xl" />)}
      </div>
      {/* Reserves */}
      <Skeleton className="h-32 rounded-3xl" />
      {/* Shifts */}
      <Skeleton className="h-44 rounded-3xl" />
    </div>
  )
}
