"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import {
  formatMoney,
  formatPercent,
  formatQuantity,
  pnlClass,
} from "@/lib/format"
import { ThemePicker } from "./theme-picker"
import type { HoldingRow, ThemeOption } from "@/server/portfolio/queries"

type SortKey =
  | "symbol"
  | "market_value"
  | "unrealized_pnl"
  | "unrealized_pnl_pct"
  | "day_change_pct"
  | "quantity"
  | "weight"

type Row = HoldingRow & { weight: number | null }

export function HoldingsTable({
  rows,
  themes,
}: {
  rows: Row[]
  themes: ThemeOption[]
}) {
  const t = useTranslations("portfolio")
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "market_value",
    dir: "desc",
  })
  const [showZombies, setShowZombies] = useState(true)

  const filtered = useMemo(
    () => (showZombies ? rows : rows.filter((r) => !r.is_zombie)),
    [rows, showZombies],
  )

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      if (typeof va === "string" && typeof vb === "string") {
        return sort.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      const na = Number(va)
      const nb = Number(vb)
      return sort.dir === "asc" ? na - nb : nb - na
    })
    return copy
  }, [filtered, sort])

  const zombieCount = rows.filter((r) => r.is_zombie).length

  return (
    <div className="rounded-lg border border-border bg-surface/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-xs font-mono uppercase tracking-[0.22em] text-muted">
          {t("tableTitle")}
        </h2>
        {zombieCount > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-strong cursor-pointer">
            <input
              type="checkbox"
              checked={showZombies}
              onChange={(e) => setShowZombies(e.target.checked)}
              className="accent-accent"
            />
            {t("showZombies", { count: zombieCount })}
          </label>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-mono uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-border">
              <Th
                onClick={() => toggle(setSort, sort, "symbol")}
                active={sort.key === "symbol"}
                dir={sort.dir}
                align="left"
              >
                {t("colSymbol")}
              </Th>
              <Th align="left">{t("colTheme")}</Th>
              <Th
                onClick={() => toggle(setSort, sort, "quantity")}
                active={sort.key === "quantity"}
                dir={sort.dir}
              >
                {t("colQuantity")}
              </Th>
              <Th>{t("colPrice")}</Th>
              <Th
                onClick={() => toggle(setSort, sort, "market_value")}
                active={sort.key === "market_value"}
                dir={sort.dir}
              >
                {t("colValue")}
              </Th>
              <Th
                onClick={() => toggle(setSort, sort, "weight")}
                active={sort.key === "weight"}
                dir={sort.dir}
              >
                {t("colWeight")}
              </Th>
              <Th
                onClick={() => toggle(setSort, sort, "day_change_pct")}
                active={sort.key === "day_change_pct"}
                dir={sort.dir}
              >
                {t("colDay")}
              </Th>
              <Th
                onClick={() => toggle(setSort, sort, "unrealized_pnl")}
                active={sort.key === "unrealized_pnl"}
                dir={sort.dir}
              >
                {t("colPnl")}
              </Th>
              <Th
                onClick={() => toggle(setSort, sort, "unrealized_pnl_pct")}
                active={sort.key === "unrealized_pnl_pct"}
                dir={sort.dir}
              >
                {t("colPnlPct")}
              </Th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-foreground">
            {sorted.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-border/60 last:border-0 hover:bg-surface-2/40 transition-colors ${
                  row.is_zombie ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{row.symbol}</span>
                    {row.is_zombie && (
                      <span className="text-[10px] uppercase tracking-wider text-loss border border-loss/40 rounded px-1.5 py-0.5">
                        {t("zombieBadge")}
                      </span>
                    )}
                  </div>
                  {row.description && (
                    <div className="text-[11px] text-muted font-sans truncate max-w-[220px]">
                      {row.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5 font-sans">
                  <ThemePicker
                    holdingId={row.id}
                    current={{
                      id: row.theme_id,
                      name: row.theme_name,
                      color: row.theme_color,
                    }}
                    themes={themes}
                  />
                </td>
                <td className="px-4 py-2.5 text-right">
                  {formatQuantity(row.quantity)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {formatMoney(row.market_price, row.currency)}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatMoney(row.market_value, row.currency)}
                </td>
                <td className="px-4 py-2.5 text-right text-muted-strong">
                  {row.weight === null ? "—" : `${row.weight.toFixed(1)} %`}
                </td>
                <td className={`px-4 py-2.5 text-right ${pnlClass(row.day_change_pct)}`}>
                  {formatPercent(row.day_change_pct)}
                </td>
                <td className={`px-4 py-2.5 text-right ${pnlClass(row.unrealized_pnl)}`}>
                  {formatMoney(row.unrealized_pnl, row.currency)}
                </td>
                <td className={`px-4 py-2.5 text-right ${pnlClass(row.unrealized_pnl_pct)}`}>
                  {formatPercent(row.unrealized_pnl_pct)}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  {t("noPosition")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  dir,
  align = "right",
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
  dir?: "asc" | "desc"
  align?: "left" | "right"
}) {
  const base =
    "px-4 py-2.5 font-medium select-none whitespace-nowrap " +
    (align === "right" ? "text-right" : "text-left")
  if (!onClick) return <th className={base}>{children}</th>
  return (
    <th
      onClick={onClick}
      className={`${base} cursor-pointer hover:text-foreground transition-colors ${
        active ? "text-accent" : ""
      }`}
    >
      {children}
      {active && (
        <span className="ml-1 text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  )
}

function toggle(
  setSort: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: "asc" | "desc" }>>,
  current: { key: SortKey; dir: "asc" | "desc" },
  key: SortKey,
) {
  setSort({
    key,
    dir: current.key === key ? (current.dir === "asc" ? "desc" : "asc") : "desc",
  })
}
