import { describe, it, expect } from "vitest"
import { classifySymbol } from "./classifier"

describe("classifySymbol — explicite", () => {
  it("classe les tickers mining crypto", () => {
    expect(classifySymbol("HIVE")).toBe("mining-crypto")
    expect(classifySymbol("HUT")).toBe("mining-crypto")
    expect(classifySymbol("RIOT")).toBe("mining-crypto")
    expect(classifySymbol("CAN")).toBe("mining-crypto")
  })

  it("classe les ETF crypto", () => {
    expect(classifySymbol("ETHX.B")).toBe("crypto-etf")
    expect(classifySymbol("COIN")).toBe("crypto-etf")
  })

  it("classe les tickers IA", () => {
    expect(classifySymbol("PLTR")).toBe("ai")
    expect(classifySymbol("NVDA")).toBe("ai")
  })

  it("classe les blue chips", () => {
    expect(classifySymbol("BABA")).toBe("value-bluechip")
    expect(classifySymbol("AAPL")).toBe("value-bluechip")
    expect(classifySymbol("NOK")).toBe("value-bluechip")
  })

  it("classe le spéculatif", () => {
    expect(classifySymbol("ACB")).toBe("speculative")
    expect(classifySymbol("PQEFF")).toBe("speculative")
    expect(classifySymbol("PRME")).toBe("speculative")
    expect(classifySymbol("IZEA")).toBe("speculative")
  })

  it("classe la biotech", () => {
    expect(classifySymbol("PACB")).toBe("biotech")
  })

  it("classe l'espace", () => {
    expect(classifySymbol("ARKX")).toBe("space")
    expect(classifySymbol("RKLB")).toBe("space")
  })
})

describe("classifySymbol — heuristiques", () => {
  it("ARK + suffixe → thème associé", () => {
    expect(classifySymbol("ARKG")).toBe("biotech")
    expect(classifySymbol("ARKK")).toBe("ai")
  })

  it("description avec BITCOIN + ETF → crypto-etf", () => {
    expect(classifySymbol("UNKWN", "PURPOSE BITCOIN ETF UNHEDGED")).toBe("crypto-etf")
  })

  it("description avec PHARMACEUTICAL → biotech", () => {
    expect(classifySymbol("UNKWN", "ACME PHARMACEUTICAL CORP")).toBe("biotech")
  })

  it("description avec SATELLITE → space", () => {
    expect(classifySymbol("UNKWN", "GLOBAL SATELLITE INC")).toBe("space")
  })

  it("retourne null pour un inconnu sans heuristique", () => {
    expect(classifySymbol("ZZZZ")).toBeNull()
    expect(classifySymbol("XYZ", "Some company name")).toBeNull()
  })
})

describe("classifySymbol — robustesse", () => {
  it("est insensible à la casse", () => {
    expect(classifySymbol("baba")).toBe("value-bluechip")
    expect(classifySymbol("hive")).toBe("mining-crypto")
  })
})
