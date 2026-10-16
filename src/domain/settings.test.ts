import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_SETTINGS, zoneHeights } from "./settings.ts";

describe("zoneHeights", () => {
  test("measures the lower zone from the floor up to the top of the fixed shelf", () => {
    const heights = zoneHeights({
      ...DEFAULT_SETTINGS,
      innerHeight: 190,
      shelfThickness: 1.6,
      baseHeight: 10,
      fixedShelfTop: 106,
    });

    expect(heights.lower).toBeCloseTo(94.4);
    expect(heights.upper).toBeCloseTo(94);
  });

  test("keeps the fixed shelf inside the bookcase", () => {
    const heights = zoneHeights({ ...DEFAULT_SETTINGS, fixedShelfTop: 400 });

    expect(heights.lower).toBeCloseTo(
      DEFAULT_SETTINGS.innerHeight - DEFAULT_SETTINGS.shelfThickness,
    );
    expect(heights.upper).toBe(0);
  });
});
