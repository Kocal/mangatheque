import { describe, expect, test } from "vite-plus/test";
import { buildUnits, estimateDimensions } from "./ordering.ts";
import type { Audience, Collection, Series } from "./types.ts";

function series(
  title: string,
  audience: Audience | null,
  volumes = 1,
  editionTitle: string | null = null,
): Series {
  return {
    id: title,
    title,
    audience,
    editions: [
      {
        id: `${title}-ed`,
        title: editionTitle,
        volumes: Array.from({ length: volumes }, (_, i) => ({
          id: `${title}-${i + 1}`,
          number: i + 1,
          isbn: null,
          asin: null,
          imageUrl: `cover-${title}-${i + 1}`,
        })),
      },
    ],
  };
}

function collection(...list: Series[]): Collection {
  return { user: "test", fetchedAt: "2026-10-16T00:00:00Z", series: list };
}

const titles = (c: Collection, universes = []) =>
  buildUnits(c, {}, universes).map((u) => u.seriesTitle);

describe("buildUnits", () => {
  test("groups audiences in Shōnen, Seinen, Shōjo, Josei, Kodomo order then null", () => {
    const c = collection(
      series("A sans public", null),
      series("B kodomo", "Kodomo"),
      series("C josei", "Josei"),
      series("D shojo", "Shōjo"),
      series("E seinen", "Seinen"),
      series("F shonen", "Shōnen"),
    );

    expect(buildUnits(c, {}, []).map((u) => u.group)).toEqual([
      "Shōnen",
      "Seinen",
      "Shōjo",
      "Josei",
      "Kodomo",
      null,
    ]);
  });

  test("sorts series with French collation inside a group", () => {
    const c = collection(
      series("Zelda", "Seinen"),
      series("Ajin", "Seinen"),
      series("Éclair", "Seinen"),
    );

    expect(titles(c)).toEqual(["Ajin", "Éclair", "Zelda"]);
  });

  test("keeps universe series adjacent in list order", () => {
    const c = collection(
      series("Kingdom", "Seinen"),
      series("GTO", "Shōnen"),
      series("Ajin", "Seinen"),
      series("Young GTO", "Shōnen"),
      series("Ao Ashi", "Shōnen"),
      series("GTO Shonan 14 days", "Shōnen"),
    );
    const universes = [{ name: "GTO", series: ["Young GTO", "GTO", "GTO Shonan 14 days"] }];

    expect(buildUnits(c, {}, universes).map((u) => u.seriesTitle)).toEqual([
      "Ao Ashi",
      "Young GTO",
      "GTO",
      "GTO Shonan 14 days",
      "Ajin",
      "Kingdom",
    ]);
  });

  test("gives a universe its most represented audience by volume count", () => {
    const c = collection(
      series("GTO", "Shōnen", 13),
      series("GTO Shonan 14 days", null, 9),
      series("Shonan Seven", "Seinen", 5),
    );
    const universes = [{ name: "GTO", series: ["GTO", "GTO Shonan 14 days", "Shonan Seven"] }];

    expect(buildUnits(c, {}, universes).map((u) => u.group)).toEqual([
      "Shōnen",
      "Shōnen",
      "Shōnen",
    ]);
  });

  test("orders volumes by edition then number", () => {
    const s: Series = {
      id: "berserk",
      title: "Berserk",
      audience: "Seinen",
      editions: [
        {
          id: "normal",
          title: null,
          volumes: [
            { id: "n2", number: 2, isbn: null, asin: null, imageUrl: null },
            { id: "n1", number: 1, isbn: null, asin: null, imageUrl: null },
          ],
        },
        {
          id: "collector",
          title: "Edition collector",
          volumes: [{ id: "c1", number: 1, isbn: null, asin: null, imageUrl: null }],
        },
      ],
    };

    expect(buildUnits(collection(s), {}, [])[0].books.map((b) => b.id)).toEqual(["n1", "n2", "c1"]);
  });

  test("uses cached dimensions by volume id and sums the unit thickness", () => {
    const dims = {
      "One Piece-1": { width: 11.5, thickness: 1.9, height: 18 },
      "One Piece-2": { width: 11.5, thickness: 2.1, height: 18 },
    };

    const [unit] = buildUnits(collection(series("One Piece", "Shōnen", 2)), dims, []);

    expect(unit.books.map((b) => b.estimated)).toEqual([false, false]);
    expect(unit.thickness).toBeCloseTo(4);
  });

  test("estimates dimensions when the ASIN is unknown", () => {
    const [unit] = buildUnits(collection(series("Monster", "Seinen", 1)), {}, []);

    expect(unit.books[0].dims).toEqual({ width: 11.5, thickness: 1.8, height: 18 });
    expect(unit.books[0].estimated).toBe(true);
  });

  test("estimates a volume from the known volumes of the same edition", () => {
    const dims = {
      "Kingdom-1": { width: 12.9, thickness: 1.6, height: 18.3 },
      "Kingdom-2": { width: 12.9, thickness: 1.8, height: 18.3 },
    };

    const [unit] = buildUnits(collection(series("Kingdom", "Seinen", 3)), dims, []);

    expect(unit.books[2].estimated).toBe(true);
    expect(unit.books[2].dims.width).toBeCloseTo(12.9);
    expect(unit.books[2].dims.thickness).toBeCloseTo(1.7);
    expect(unit.books[2].dims.height).toBeCloseTo(18.3);
  });

  test("carries the volume cover onto the book", () => {
    const [unit] = buildUnits(collection(series("Ajin", "Seinen", 2)), {}, []);

    expect(unit.books.map((b) => b.cover)).toEqual(["cover-Ajin-1", "cover-Ajin-2"]);
  });

  test("estimates a thicker volume for a double edition", () => {
    expect(estimateDimensions({ id: "e", title: "Édition Double", volumes: [] })).toEqual({
      width: 11.5,
      thickness: 2.9,
      height: 18,
    });
  });

  test("numbers series colors inside each group", () => {
    const c = collection(series("A", "Seinen"), series("B", "Seinen"), series("C", "Shōnen"));

    expect(buildUnits(c, {}, []).map((u) => [u.seriesTitle, u.colorIndex])).toEqual([
      ["C", 0],
      ["A", 0],
      ["B", 1],
    ]);
  });
});
