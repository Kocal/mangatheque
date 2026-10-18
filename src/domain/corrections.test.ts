import { describe, expect, test } from "vite-plus/test";
import { applyCorrections } from "./corrections.ts";
import type { Collection, Series } from "./types.ts";

function series(title: string, numbers: number[]): Series {
  return {
    id: title,
    title,
    audience: "Shōnen",
    editions: [
      {
        id: `${title}-ed`,
        title: null,
        volumes: numbers.map((number) => ({
          id: `${title}-${number}`,
          number,
          isbn: null,
          asin: null,
          imageUrl: `cover-${number}`,
        })),
      },
    ],
  };
}

function collection(...list: Series[]): Collection {
  return { user: "test", fetchedAt: "2026-10-17T00:00:00Z", series: list };
}

const numbersOf = (c: Collection, title: string) =>
  c.series.find((s) => s.title === title)?.editions.flatMap((e) => e.volumes.map((v) => v.number));

describe("applyCorrections", () => {
  test("removes a whole series", () => {
    const fixed = applyCorrections(collection(series("Infection", [1, 2]), series("Ajin", [1])), [
      { remove: "Infection" },
    ]);

    expect(fixed.series.map((s) => s.title)).toEqual(["Ajin"]);
  });

  test("removes only the listed volumes of a series", () => {
    const fixed = applyCorrections(collection(series("Dofus", [1, 2, 3])), [
      { remove: "Dofus", volumes: [2, 3] },
    ]);

    expect(numbersOf(fixed, "Dofus")).toEqual([1]);
  });

  test("drops a series once all its volumes are removed", () => {
    const fixed = applyCorrections(collection(series("Dofus", [1])), [
      { remove: "Dofus", volumes: [1] },
    ]);

    expect(fixed.series).toEqual([]);
  });

  test("adds a missing series without cover", () => {
    const fixed = applyCorrections(collection(), [
      { add: "Re:Zero", audience: "Seinen", volumes: [1, 2] },
    ]);

    expect(fixed.series).toHaveLength(1);
    expect(fixed.series[0].audience).toBe("Seinen");
    expect(numbersOf(fixed, "Re:Zero")).toEqual([1, 2]);
    expect(fixed.series[0].editions[0].volumes.map((v) => v.imageUrl)).toEqual([null, null]);
  });

  test("adds only the volumes Manga Collec does not list yet", () => {
    const fixed = applyCorrections(collection(series("Re:Zero", [1])), [
      { add: "Re:Zero", audience: "Seinen", volumes: [1, 2] },
    ]);

    expect(numbersOf(fixed, "Re:Zero")).toEqual([1, 2]);
    expect(fixed.series[0].editions[0].volumes[0].imageUrl).toBe("cover-1");
  });

  test("ignores a removal of a series that is already gone", () => {
    const original = collection(series("Ajin", [1]));

    expect(applyCorrections(original, [{ remove: "Infection" }])).toEqual(original);
  });
});
