import { describe, expect, test } from "vite-plus/test";
import { computeLayout, splitLongUnits } from "./layout.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import { makeUnit } from "./test-helpers.ts";

const settings = { ...DEFAULT_SETTINGS, innerWidth: 76, rowSlack: 1 };

const shape = (layout: ReturnType<typeof computeLayout>) =>
  layout.bookcases.map((bookcase) =>
    bookcase.compartments.map((c) => ({
      zone: c.zone,
      front: c.front.books.length,
      back: c.back?.books.length ?? 0,
    })),
  );

describe("splitLongUnits", () => {
  test("splits a series longer than two rows into compartment-sized chunks", () => {
    const [first, second, other] = splitLongUnits(
      [makeUnit("conan", 133, 1.5), makeUnit("other", 2, 1.5)],
      settings,
    );

    expect(first.books.length).toBe(100);
    expect(second.books.length).toBe(33);
    expect(second.books[0].number).toBe(101);
    expect([first.key, second.key, other.key]).toEqual(["conan#1", "conan#2", "other"]);
    expect(second.thickness).toBeCloseTo(49.5);
  });
});

describe("computeLayout", () => {
  test("places everything in single rows when it fits", () => {
    const layout = computeLayout(
      [makeUnit("a", 10, 1.5), makeUnit("b", 10, 1.5), makeUnit("c", 10, 1.5)],
      settings,
    );

    expect(shape(layout)).toEqual([[{ zone: "upper", front: 30, back: 0 }], [], [], []]);
    expect(layout.doubleCount).toBe(0);
    expect(layout.placedCount).toBe(30);
    expect(layout.overflow).toEqual([]);
  });

  test("uses a double row only for a series longer than a row", () => {
    const layout = computeLayout([makeUnit("long", 60, 1.5), makeUnit("small", 10, 1.5)], settings);

    expect(shape(layout)[0]).toEqual([
      { zone: "upper", front: 50, back: 10 },
      { zone: "upper", front: 10, back: 0 },
    ]);
    expect(layout.doubleCount).toBe(1);
  });

  test("prefers more single compartments over a double one", () => {
    const layout = computeLayout([makeUnit("a", 30, 1.5), makeUnit("b", 30, 1.5)], settings);

    expect(shape(layout)[0]).toEqual([
      { zone: "upper", front: 30, back: 0 },
      { zone: "upper", front: 30, back: 0 },
    ]);
  });

  test("respects the lower zone height", () => {
    const short = { ...settings, bookcaseCount: 2, innerHeight: 60, fixedShelfHeight: 24 };

    const layout = computeLayout([makeUnit("a", 40, 1.5), makeUnit("long", 60, 1.5)], short);

    expect(shape(layout)).toEqual([
      [{ zone: "upper", front: 40, back: 0 }],
      [{ zone: "upper", front: 50, back: 10 }],
    ]);
  });

  test("never exceeds maxShelves + 1 compartments per bookcase", () => {
    const tall = {
      ...settings,
      bookcaseCount: 1,
      innerHeight: 400,
      fixedShelfHeight: 200,
      maxShelves: 3,
    };
    const tooDeepForDoubleRows = { width: 15 };
    const units = Array.from({ length: 6 }, (_, i) =>
      makeUnit(`u${i}`, 40, 1.5, tooDeepForDoubleRows),
    );

    const layout = computeLayout(units, tall);

    expect(layout.bookcases[0].compartments).toHaveLength(4);
    expect(layout.overflow).toHaveLength(80);
  });

  test("splits a series longer than two rows across compartments", () => {
    const layout = computeLayout([makeUnit("conan", 133, 1.5)], settings);

    expect(shape(layout)[0]).toEqual([
      { zone: "upper", front: 50, back: 50 },
      { zone: "upper", front: 33, back: 0 },
    ]);
  });

  test("reports overflow when the collection does not fit", () => {
    const one = { ...settings, bookcaseCount: 1 };
    const units = Array.from({ length: 15 }, (_, i) => makeUnit(`u${i}`, 40, 1.5));

    const layout = computeLayout(units, one);

    expect(layout.placedCount).toBe(480);
    expect(layout.overflow).toHaveLength(120);
    expect(layout.overflow[0].id).toBe("u12-1");
    expect(layout.overflow.at(-1)?.id).toBe("u14-40");
  });

  test("skips a unit too tall for any compartment and keeps placing the next ones", () => {
    const layout = computeLayout(
      [makeUnit("giant", 1, 2, { height: 300 }), makeUnit("a", 10, 1.5)],
      settings,
    );

    expect(layout.overflow.map((b) => b.id)).toEqual(["giant-1"]);
    expect(layout.placedCount).toBe(10);
  });

  test("assigns shelf heights that fill each used zone", () => {
    const layout = computeLayout([makeUnit("a", 40, 1.5), makeUnit("b", 40, 1.5)], settings);

    const [top, under] = layout.bookcases[0].compartments;
    expect(top.bottom + top.height).toBeCloseTo(settings.innerHeight);
    expect(under.bottom).toBeCloseTo(settings.fixedShelfHeight + settings.shelfThickness);
    expect(under.height).toBeGreaterThanOrEqual(under.neededHeight);
  });

  test("does not hang with a zero inner width", () => {
    const layout = computeLayout([makeUnit("a", 10, 1.5)], { ...settings, innerWidth: 0 });

    expect(layout.placedCount).toBe(0);
    expect(layout.overflow).toHaveLength(10);
  });
});

describe("computeLayout regressions", () => {
  test("splits a series just under two rows when whole tomes do not fit in two rows", () => {
    const layout = computeLayout([makeUnit("conan", 83, 1.8)], settings);

    expect(layout.overflow).toHaveLength(0);
    expect(layout.placedCount).toBe(83);
  });

  test("puts a long series in single rows when a double row is too deep", () => {
    const layout = computeLayout([makeUnit("kingdom", 69, 1.7, { width: 12.9 })], {
      ...settings,
      innerDepth: 25.7,
    });

    expect(layout.overflow).toHaveLength(0);
    expect(layout.doubleCount).toBe(0);
  });

  test("puts a long series in single rows when the riser is too tall for a double row", () => {
    const layout = computeLayout([makeUnit("kingdom", 69, 1.7)], { ...settings, riserHeight: 300 });

    expect(layout.overflow).toHaveLength(0);
  });

  test("keeps compartments inside the bookcase when the fixed shelf is set above the top", () => {
    const layout = computeLayout([makeUnit("a", 40, 1.5)], { ...settings, fixedShelfHeight: 300 });

    for (const c of layout.bookcases.flatMap((b) => b.compartments)) {
      expect(c.bottom).toBeGreaterThanOrEqual(0);
      expect(c.bottom + c.height).toBeLessThanOrEqual(settings.innerHeight + 1e-6);
    }
  });
});
