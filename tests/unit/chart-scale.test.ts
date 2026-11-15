import { expect, test } from "vitest"
import {
  band,
  labelIndexes,
  linear,
  niceDomain,
  point,
  tickFormatter,
} from "@/registry/uiset/ui/chart/scale"

test("nice domains round out to 1, 2, 2.5 or 5 steps and keep zero", () => {
  expect(niceDomain(3, 97)).toEqual({ domain: [0, 100], ticks: [0, 20, 40, 60, 80, 100] })
  expect(niceDomain(-12, 38).ticks).toEqual([-20, -10, 0, 10, 20, 30, 40])
  expect(niceDomain(0.12, 0.93).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
  expect(niceDomain(980, 1020, 4, false).domain).toEqual([980, 1020])
})

test("a flat series still gets an axis", () => {
  expect(niceDomain(0, 0).domain).toEqual([0, 1])
  expect(niceDomain(50, 50).domain).toEqual([0, 50])
  expect(niceDomain(50, 50, 5, false).domain[1]).toBeGreaterThan(50)
})

test("linear maps the nice domain onto the range and inverts", () => {
  const y = linear([3, 97], [200, 0])
  expect(y(0)).toBe(200)
  expect(y(100)).toBe(0)
  expect(y(50)).toBe(100)
  expect(y.invert(100)).toBe(50)
})

test("bands leave a gap between categories", () => {
  const x = band(["a", "b", "c"], [0, 310], 0.1)
  expect(x.step).toBeCloseTo(100)
  expect(x.bandwidth).toBeCloseTo(90)
  expect(x("a")).toBeCloseTo(10)
  expect(x("b") - (x("a") + x.bandwidth)).toBeCloseTo(10)
  expect(310 - (x("c") + x.bandwidth)).toBeCloseTo(10)
})

test("points spread across the range; a single point sits in the middle", () => {
  expect([0, 1, 2].map(point(3, [0, 100]))).toEqual([0, 50, 100])
  expect(point(1, [0, 100])(0)).toBe(50)
})

test("tick labels are full under 10,000 and compact past it, one style per axis", () => {
  expect([0, 2500, 5000].map(tickFormatter([0, 2500, 5000], "en-US"))).toEqual([
    "0",
    "2,500",
    "5,000",
  ])
  expect([0, 10000, 20000].map(tickFormatter([0, 10000, 20000], "en-US"))).toEqual([
    "0",
    "10K",
    "20K",
  ])
  expect([0, 0.25, 0.5].map(tickFormatter([0, 0.25, 0.5], "en-US"))).toEqual(["0", "0.25", "0.5"])
})

test("label indexes keep the ends and thin the middle", () => {
  expect(labelIndexes(5, 6)).toEqual([0, 1, 2, 3, 4])
  const picked = labelIndexes(30, 6)
  expect(picked[0]).toBe(0)
  expect(picked.at(-1)).toBe(29)
  expect(picked.length).toBeLessThanOrEqual(7)
})
