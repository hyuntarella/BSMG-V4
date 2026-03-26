'use client'

interface MarginGaugeProps {
  margin: number
  className?: string
}

export default function MarginGauge({ margin, className = '' }: MarginGaugeProps) {
  const clamped = Math.max(0, Math.min(100, margin))
  const color = clamped >= 50 ? 'bg-green-500' : clamped >= 45 ? 'bg-yellow-500' : 'bg-red-500'
  const textColor = clamped >= 50 ? 'text-green-700' : clamped >= 45 ? 'text-yellow-700' : 'text-red-700'

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-gray-500">마진</span>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`text-sm font-semibold tabular-nums ${textColor}`}>
        {margin.toFixed(1)}%
      </span>
    </div>
  )
}
