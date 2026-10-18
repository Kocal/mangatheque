import type { Audience, Unit } from "./types.ts";

export function makeUnit(
  key: string,
  count: number,
  thickness: number,
  { height = 18, width = 11.5, group = "Shōnen" as Audience | null } = {},
): Unit {
  const books = Array.from({ length: count }, (_, i) => ({
    id: `${key}-${i + 1}`,
    seriesTitle: key,
    editionTitle: null,
    number: i + 1,
    dims: { width, thickness, height },
    estimated: false,
    cover: null,
  }));
  return { key, seriesTitle: key, group, books, thickness: count * thickness, colorIndex: 0 };
}
