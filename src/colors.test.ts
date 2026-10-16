import { describe, expect, test } from "vite-plus/test";
import { AUDIENCE_HUES, backRowColor, seriesColor, textColorOn } from "./colors.ts";

describe("seriesColor", () => {
  test("uses the hue of the audience", () => {
    expect(seriesColor("Seinen", 0)).toContain(`hsl(${AUDIENCE_HUES.Seinen} `);
  });

  test("gives neighbouring series different shades", () => {
    expect(seriesColor("Shōnen", 0)).not.toBe(seriesColor("Shōnen", 1));
  });

  test("uses a grey for series without audience", () => {
    expect(seriesColor(null, 3)).toMatch(/^hsl\(\d+ 0% /);
  });
});

describe("backRowColor", () => {
  test("darkens a series color for the back row", () => {
    expect(backRowColor("hsl(24 72% 52%)")).toBe("hsl(24 61% 32%)");
  });

  test("darkens a grey for the back row", () => {
    expect(backRowColor("hsl(0 0% 52%)")).toBe("hsl(0 0% 32%)");
  });
});

describe("textColorOn", () => {
  test("writes dark text on a light spine", () => {
    expect(textColorOn("hsl(24 80% 63%)")).toBe("#1d1b18");
  });

  test("writes white text on a dark spine", () => {
    expect(textColorOn("hsl(214 60% 40%)")).toBe("#ffffff");
  });
});
