import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

export const SUPPORTED_LOCALES = ["fr", "en"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "fr"

function isLocale(value: string | undefined): value is Locale {
  return value === "fr" || value === "en"
}

/**
 * Résout la locale active :
 *  1. cookie `locale` (set par le switcher)
 *  2. header Accept-Language (négociation HTTP)
 *  3. défaut : fr
 */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get("locale")?.value
  if (isLocale(fromCookie)) return fromCookie

  const hdrs = await headers()
  const accept = hdrs.get("accept-language") ?? ""
  // Très simple : on regarde si "en" arrive avant "fr"
  const lowered = accept.toLowerCase()
  const enIdx = lowered.indexOf("en")
  const frIdx = lowered.indexOf("fr")
  if (enIdx !== -1 && (frIdx === -1 || enIdx < frIdx)) return "en"
  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
