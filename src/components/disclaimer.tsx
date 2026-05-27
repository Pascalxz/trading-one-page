import { useTranslations } from "next-intl"

export function Disclaimer({ variant = "footer" }: { variant?: "footer" | "inline" }) {
  const t = useTranslations("disclaimer")
  const base = "text-[11px] leading-relaxed text-muted tracking-wide"
  if (variant === "inline") {
    return (
      <p className={`${base} border-l-2 border-border-strong pl-3`}>
        {t("inline")}
      </p>
    )
  }
  return (
    <footer className="mt-auto border-t border-border bg-surface/60">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <p className={base}>
          <span className="font-mono uppercase tracking-[0.18em] text-muted-strong">
            {t("label")}
          </span>{" "}
          {t("footer")}
        </p>
      </div>
    </footer>
  )
}
