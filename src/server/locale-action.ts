"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/request"

const ONE_YEAR = 60 * 60 * 24 * 365

export async function setLocaleAction(locale: Locale): Promise<void> {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  const store = await cookies()
  store.set("locale", locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  })
  revalidatePath("/", "layout")
}
