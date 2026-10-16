import { describe, expect, test } from "vite-plus/test";
import { AUDIENCE_HUES, seriesColor } from "./colors.ts";

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
