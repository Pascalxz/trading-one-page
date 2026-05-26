import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseQuestradeCsv } from "./questrade"

/**
 * Fixture synthétique anonymisée — n'est PAS un portefeuille réel.
 * Couvre les cas : 2 comptes (CAD + USD), zombie (PQEFF), gros gagnant (HIVE),
 * champs vides (PQEFF day_change), symbole quoté (ETHX.B), perdant (ACB).
 */
const fixturePath = path.resolve(
  __dirname,
  "../__fixtures__/questrade-sample.csv",
)
const csv = readFileSync(fixturePath, "latin1") // ISO-8859-1 comme Questrade réel

describe("parseQuestradeCsv (fixture synthétique)", () => {
  const result = parseQuestradeCsv(csv)

  it("ne produit aucun warning structurel", () => {
    expect(result.warnings).toEqual([])
  })

  it("détecte les 2 comptes du fichier (CAD et USD)", () => {
    expect(result.accounts).toHaveLength(2)
    const ids = result.accounts.map((a) => a.externalId).sort()
    expect(ids).toEqual(["ACCT_CAD_001", "ACCT_USD_001"])
    const cad = result.accounts.find((a) => a.externalId === "ACCT_CAD_001")
    const usd = result.accounts.find((a) => a.externalId === "ACCT_USD_001")
    expect(cad?.currency).toBe("CAD")
    expect(usd?.currency).toBe("USD")
  })

  it("parse les 6 positions de la fixture", () => {
    expect(result.holdings).toHaveLength(6)
  })

  it("parse BABA correctement (valeurs numériques typées)", () => {
    const baba = result.holdings.find((h) => h.symbol === "BABA")
    expect(baba).toBeDefined()
    expect(baba!.quantity).toBe(10)
    expect(baba!.avgCost).toBe(100)
    expect(baba!.bookValue).toBe(1000)
    expect(baba!.marketPrice).toBe(150)
    expect(baba!.marketValue).toBe(1500)
    expect(baba!.unrealizedPnl).toBe(500)
    expect(baba!.unrealizedPnlPct).toBeCloseTo(50, 2)
    expect(baba!.dayChangePct).toBeCloseTo(-0.2, 2)
    expect(baba!.isZombie).toBe(false)
  })

  it("détecte PQEFF comme zombie (-100% et valeur 0)", () => {
    const pqeff = result.holdings.find((h) => h.symbol === "PQEFF")
    expect(pqeff).toBeDefined()
    expect(pqeff!.isZombie).toBe(true)
    expect(pqeff!.unrealizedPnlPct).toBe(-100)
    expect(pqeff!.marketValue).toBe(0)
  })

  it("ne classe PAS HIVE en zombie (gros gagnant)", () => {
    const hive = result.holdings.find((h) => h.symbol === "HIVE")
    expect(hive?.isZombie).toBe(false)
    expect(hive?.unrealizedPnlPct).toBeCloseTo(200, 2)
  })

  it("tolère les champs vides (intérêt couru, day change sur PQEFF)", () => {
    const pqeff = result.holdings.find((h) => h.symbol === "PQEFF")
    expect(pqeff?.accruedInterest).toBeNull()
    expect(pqeff?.dayChangePct).toBeNull()
    expect(pqeff?.dayChangeAmount).toBeNull()
  })

  it("conserve les caractères accentués des descriptions", () => {
    const ethxb = result.holdings.find((h) => h.symbol === "ETHX.B")
    expect(ethxb?.description).toContain("ETHEREUM")
  })

  it("parse correctement les pertes (ACB)", () => {
    const acb = result.holdings.find((h) => h.symbol === "ACB")
    expect(acb?.quantity).toBe(100)
    expect(acb?.unrealizedPnl).toBe(-300)
    expect(acb?.unrealizedPnlPct).toBeCloseTo(-60, 2)
    expect(acb?.isZombie).toBe(false)
  })

  it("parse le compte USD avec sa devise et sa position", () => {
    const arkx = result.holdings.find((h) => h.symbol === "ARKX")
    expect(arkx?.accountCurrency).toBe("USD")
    expect(arkx?.marketValue).toBe(800)
    expect(arkx?.accountExternalId).toBe("ACCT_USD_001")
  })
})
