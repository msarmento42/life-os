/**
 * Skeleton primitives — shimmer placeholders for data-fetching states.
 *
 * Usage:
 *   <Skeleton className="h-4 w-32" />
 *   <SkeletonText lines={3} />
 *   <SkeletonCard />
 */

export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3"
          style={{ width: `${85 - i * 10}%` }}
        />
      ))}
    </div>
  )
}

export function SkeletonTitle({ className = '' }) {
  return <div className={`skeleton-title ${className}`} />
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card space-y-3 ${className}`}>
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-7 w-1/2" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
    </div>
  )
}

export function SkeletonStat({ className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-7 w-24 mt-2" />
    </div>
  )
}

export function SkeletonRow({ cols = 4, className = '' }) {
  return (
    <div className={`flex gap-3 items-center ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="skeleton h-3 flex-1" />
      ))}
    </div>
  )
}

export function SkeletonCircle({ size = 40, className = '' }) {
  return (
    <div
      className={`skeleton-circle ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
