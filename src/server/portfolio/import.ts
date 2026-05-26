"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { parseQuestradeCsv } from "@/lib/csv/adapters/questrade"

export type ImportState = {
  status: "idle" | "ok" | "error"
  message?: string
  imported?: {
    accounts: number
    holdings: number
    zombies: number
    warnings: string[]
  }
}

const initialState: ImportState = { status: "idle" }
export { initialState as importInitialState }

export async function importQuestradeCsvAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Aucun fichier reçu." }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { status: "error", message: "Fichier trop volumineux (max 5 Mo)." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: "error", message: "Non authentifié." }
  }

  let text: string
  try {
    const buf = await file.arrayBuffer()
    text = new TextDecoder("windows-1252").decode(buf)
  } catch {
    return { status: "error", message: "Impossible de lire le fichier (encodage)." }
  }

  let parsed
  try {
    parsed = parseQuestradeCsv(text)
  } catch (e) {
    return {
      status: "error",
      message: `Échec du parsing : ${e instanceof Error ? e.message : "inconnue"}`,
    }
  }

  if (parsed.accounts.length === 0) {
    return {
      status: "error",
      message: parsed.warnings[0] ?? "Aucun compte détecté dans le fichier.",
    }
  }

  // 1. Upsert des comptes
  const accountsPayload = parsed.accounts.map((a) => ({
    user_id: user.id,
    external_id: a.externalId,
    broker: "questrade",
    currency: a.currency,
  }))
  const { error: accErr } = await supabase
    .from("accounts")
    .upsert(accountsPayload, { onConflict: "user_id,external_id" })

  if (accErr) {
    return { status: "error", message: `accounts upsert: ${accErr.message}` }
  }

  // Récupérer les ids pour map symbol→account_id
  const { data: accs, error: accFetchErr } = await supabase
    .from("accounts")
    .select("id, external_id")
    .eq("user_id", user.id)

  if (accFetchErr || !accs) {
    return {
      status: "error",
      message: `accounts fetch: ${accFetchErr?.message ?? "vide"}`,
    }
  }

  const accountIdByExternal = new Map(accs.map((a) => [a.external_id, a.id]))

  // 2. Upsert holdings
  const now = new Date().toISOString()
  const holdingsPayload = parsed.holdings
    .map((h) => {
      const accountId = accountIdByExternal.get(h.accountExternalId)
      if (!accountId) return null
      return {
        user_id: user.id,
        account_id: accountId,
        symbol: h.symbol,
        description: h.description,
        quantity: h.quantity,
        avg_cost: h.avgCost,
        book_value: h.bookValue,
        market_price: h.marketPrice,
        market_value: h.marketValue,
        day_change_amount: h.dayChangeAmount,
        day_change_pct: h.dayChangePct,
        unrealized_pnl: h.unrealizedPnl,
        unrealized_pnl_pct: h.unrealizedPnlPct,
        accrued_interest: h.accruedInterest,
        borrow_value: h.borrowValue,
        currency: h.accountCurrency,
        is_zombie: h.isZombie,
        source_row: h.raw,
        imported_at: now,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const { error: holdErr } = await supabase
    .from("holdings")
    .upsert(holdingsPayload, { onConflict: "account_id,symbol" })

  if (holdErr) {
    return { status: "error", message: `holdings upsert: ${holdErr.message}` }
  }

  const zombies = parsed.holdings.filter((h) => h.isZombie).length

  revalidatePath("/portefeuille")
  revalidatePath("/dashboard")

  return {
    status: "ok",
    imported: {
      accounts: parsed.accounts.length,
      holdings: holdingsPayload.length,
      zombies,
      warnings: parsed.warnings,
    },
  }
}
