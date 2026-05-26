/** Types et constantes partagés par l'action serveur et les composants client. */

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

export const importInitialState: ImportState = { status: "idle" }
