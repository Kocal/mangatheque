import { describe, expect, test } from "vite-plus/test";
import type { BookcaseLayout, Compartment } from "./layout.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import type { Zone } from "./settings.ts";
import { assignShelfHeights } from "./shelves.ts";

const emptyRow = { books: [], width: 0, maxHeight: 0, maxDepth: 0 };

function bookcase(index: number, needs: [Zone, number][]): BookcaseLayout {
  const compartments: Compartment[] = needs.map(([zone, neededHeight]) => ({
    bookcase: index,
    zone,
    front: emptyRow,
    back: null,
    neededHeight,
    height: 0,
    bottom: 0,
  }));
  return { index, compartments };
}

const heights = (b: BookcaseLayout) => b.compartments.map((c) => Number(c.height.toFixed(2)));
const bottoms = (b: BookcaseLayout) => b.compartments.map((c) => Number(c.bottom.toFixed(2)));

describe("assignShelfHeights", () => {
  test("aligns shelves of bookcases with the same compartment count", () => {
    const first = bookcase(0, [
      ["upper", 19.5],
      ["upper", 25.5],
    ]);
    const second = bookcase(1, [
      ["upper", 25.5],
      ["upper", 19.5],
    ]);

    assignShelfHeights([first, second], DEFAULT_SETTINGS);

    expect(heights(first)).toEqual(heights(second));
    expect(bottoms(first)).toEqual(bottoms(second));
  });

  test("falls back to individual heights when the aligned heights do not fit", () => {
    const settings = { ...DEFAULT_SETTINGS, innerHeight: 125.6 };
    const first = bookcase(0, [
      ["upper", 25.5],
      ["upper", 19.5],
    ]);
    const second = bookcase(1, [
      ["upper", 19.5],
      ["upper", 25.5],
    ]);

    assignShelfHeights([first, second], settings);

    expect(heights(first)).toEqual([27.6, 20.8]);
    expect(heights(second)).toEqual([21.2, 27.2]);
  });

  test("spreads the free height evenly", () => {
    const only = bookcase(0, [
      ["upper", 19.5],
      ["upper", 19.5],
    ]);

    assignShelfHeights([only], DEFAULT_SETTINGS);

    expect(heights(only)).toEqual([56.8, 56]);
    expect(bottoms(only)).toEqual([133.2, 75.6]);
  });

  test("evens out compartments of different needed heights", () => {
    const only = bookcase(0, [
      ["upper", 19.5],
      ["upper", 19.5],
      ["upper", 19.5],
      ["upper", 25.5],
    ]);

    assignShelfHeights([only], DEFAULT_SETTINGS);

    expect(heights(only)).toEqual([28, 27.2, 27.2, 27.2]);
  });

  test("stacks the lower zone from the floor", () => {
    const only = bookcase(0, [
      ["upper", 19.5],
      ["lower", 19.5],
      ["lower", 19.5],
    ]);

    assignShelfHeights([only], DEFAULT_SETTINGS);

    expect(bottoms(only).slice(1)).toEqual([35.2, 0]);
    expect(only.compartments[1].bottom + only.compartments[1].height).toBeCloseTo(
      DEFAULT_SETTINGS.fixedShelfHeight,
    );
  });

  test("never gives a compartment less than its needed height", () => {
    const only = bookcase(0, [
      ["upper", 25.5],
      ["upper", 19.5],
      ["upper", 25.5],
      ["upper", 19.5],
    ]);

    assignShelfHeights([only], DEFAULT_SETTINGS);

    for (const c of only.compartments) {
      expect(c.height).toBeGreaterThanOrEqual(c.neededHeight);
    }
  });
});
