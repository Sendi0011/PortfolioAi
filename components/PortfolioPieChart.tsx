'use client'
import { useMemo } from 'react'

const COLORS = ['#f5a623', '#4d9fff', '#22d18b', '#f45b5b', '#a78bfa', '#fb923c']

interface Props {
  allocations: Record<string, number>
  veniceImageUrl?: string
  totalValueUSDC: number
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function buildArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, startDeg)
  const end   = polarToXY(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`
}

export function PortfolioPieChart({ allocations, veniceImageUrl, totalValueUSDC }: Props) {
  const slices = useMemo(() => {
    const entries = Object.entries(allocations).filter(([, v]) => v > 0)
    let cursor = 0
    return entries.map(([token, pct], i) => {
      const deg   = (pct / 100) * 360
      const start = cursor
      cursor += deg
      return { token, pct, startDeg: start, endDeg: cursor, color: COLORS[i % COLORS.length] }
    })
  }, [allocations])

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Venice-generated image (when available) */}
      {veniceImageUrl ? (
        <div className="relative">
          <img
            src={veniceImageUrl}
            alt="Venice AI portfolio chart"
            className="w-48 h-48 rounded-full object-cover ring-2 ring-amber/30"
          />
          <span className="absolute bottom-0 right-0 text-[10px] font-mono bg-surface text-amber px-1.5 py-0.5 rounded-full ring-1 ring-amber/40">
            Venice AI
          </span>
        </div>
      ) : (
        /* Fallback: hand-drawn SVG pie */
        <svg viewBox="0 0 160 160" width="192" height="192" className="drop-shadow-lg">
          {slices.map((s) => (
            <path
              key={s.token}
              d={buildArcPath(80, 80, 72, s.startDeg, s.endDeg)}
              fill={s.color}
              stroke="#0a0b0d"
              strokeWidth="2"
              opacity={0.9}
            />
          ))}
          {/* Centre hole */}
          <circle cx="80" cy="80" r="32" fill="#0f1115" />
          <text x="80" y="76" textAnchor="middle" fill="#c8d4e0" fontSize="9" fontFamily="monospace">
            Total
          </text>
          <text x="80" y="88" textAnchor="middle" fill="#f5a623" fontSize="9" fontFamily="monospace" fontWeight="600">
            ${totalValueUSDC >= 1000
              ? `${(totalValueUSDC / 1000).toFixed(1)}k`
              : totalValueUSDC.toFixed(0)}
          </text>
        </svg>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {slices.map((s) => (
          <div key={s.token} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-xs font-mono text-text">
              {s.token}{' '}
              <span className="text-subtle">{s.pct.toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}