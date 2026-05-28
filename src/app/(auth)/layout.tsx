import Link from "next/link"
import { Brand } from "@/components/brand"
import { Disclaimer } from "@/components/disclaimer"
import { LocaleSwitcher } from "@/components/locale-switcher"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Brand size="md" />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <Disclaimer />
    </>
  )
}
