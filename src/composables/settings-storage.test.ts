import { describe, expect, test } from "vite-plus/test";
import { DEFAULT_SETTINGS } from "../domain/settings.ts";
import { parseSettings } from "./settings-storage.ts";

describe("parseSettings", () => {
  test("returns the defaults without stored value", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  test("keeps stored numbers over the defaults", () => {
    expect(parseSettings(JSON.stringify({ innerWidth: 75.5 })).innerWidth).toBe(75.5);
  });

  test("ignores unknown keys and non numeric values", () => {
    const settings = parseSettings(JSON.stringify({ innerDepth: "deep", color: "red" }));

    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  test("ignores broken JSON", () => {
    expect(parseSettings("{oops")).toEqual(DEFAULT_SETTINGS);
  });
});

describe("isValidSetting", () => {
  test("rejects negative values", () => {
    expect(parseSettings(JSON.stringify({ headroom: -30 })).headroom).toBe(
      DEFAULT_SETTINGS.headroom,
    );
  });
});
