import { describe, it, expect } from "vitest"
import { parseCsv } from "./parse"

describe("parseCsv", () => {
  it("parse un CSV simple avec ;", () => {
    const csv = `a;b;c\n1;2;3\n4;5;6`
    const { headers, rows } = parseCsv(csv)
    expect(headers).toEqual(["a", "b", "c"])
    expect(rows).toEqual([
      { a: "1", b: "2", c: "3" },
      { a: "4", b: "5", c: "6" },
    ])
  })

  it("respecte les guillemets et les séparateurs internes", () => {
    const csv = `a;b\n"hello;world";"x"`
    const { rows } = parseCsv(csv)
    expect(rows[0]).toEqual({ a: "hello;world", b: "x" })
  })

  it("gère les champs vides ;;", () => {
    const csv = `a;b;c\n1;;3`
    const { rows } = parseCsv(csv)
    expect(rows[0]).toEqual({ a: "1", b: "", c: "3" })
  })

  it("gère les guillemets doublés (échappement)", () => {
    const csv = `a\n"il dit ""bonjour"""`
    const { rows } = parseCsv(csv)
    expect(rows[0].a).toBe('il dit "bonjour"')
  })

  it("gère les fins de ligne mixtes", () => {
    const csv = `a;b\r\n1;2\r3;4\n5;6`
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(3)
  })

  it("ignore les lignes complètement vides", () => {
    const csv = `a;b\n1;2\n\n3;4\n`
    const { rows } = parseCsv(csv)
    expect(rows).toHaveLength(2)
  })

  it("retire un BOM UTF-8", () => {
    const csv = `﻿a;b\n1;2`
    const { headers } = parseCsv(csv)
    expect(headers[0]).toBe("a")
  })
})
