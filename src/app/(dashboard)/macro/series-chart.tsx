"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import type { MacroPoint } from "@/server/macro/queries"

export function SeriesChart({
  points,
  unit,
  color = "#f5b454",
}: {
  points: MacroPoint[]
  unit?: string | null
  color?: string
}) {
  const data = useMemo(
    () =>
      points.map((p) => ({
        date: p.date,
        value: p.value,
      })),
    [points],
  )

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-muted font-mono">
        Aucune donnée — clé FRED non configurée ou cron pas encore exécuté.
      </div>
    )
  }

  return (
    <div className="h-48 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1f2933" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8b97a4", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: string) => v.slice(0, 7)}
            stroke="#2b3744"
            minTickGap={48}
          />
          <YAxis
            tick={{ fill: "#8b97a4", fontSize: 10, fontFamily: "var(--font-mono)" }}
            stroke="#2b3744"
            width={56}
            tickFormatter={(v: number) =>
              Intl.NumberFormat("fr-CA", { notation: "compact", maximumFractionDigits: 1 }).format(v)
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0d1117",
              border: "1px solid #2b3744",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "#8b97a4" }}
            itemStyle={{ color: "#e6edf3" }}
            formatter={(v) => {
              const n = typeof v === "number" ? v : Number(v)
              return [
                `${Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 }).format(n)}${unit ? " " + unit : ""}`,
                "",
              ]
            }}
            labelFormatter={(label) =>
              new Date(String(label)).toLocaleDateString("fr-CA", { year: "numeric", month: "long" })
            }
            separator=""
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
