import { describe, expect, test } from "vite-plus/test";
import type { BookcaseLayout } from "./layout.ts";
import { bookGroups, describeBooks, shelfPositions, shelvesUsed } from "./plan.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import type { Book } from "./types.ts";

function book(seriesTitle: string, number: number, editionTitle: string | null = null): Book {
  return {
    id: `${seriesTitle}-${editionTitle}-${number}`,
    seriesTitle,
    editionTitle,
    number,
    dims: { width: 11.5, thickness: 1.8, height: 18 },
    estimated: false,
    cover: `${seriesTitle}-${number}.jpg`,
  };
}

describe("describeBooks", () => {
  test("compresses consecutive volumes into a range", () => {
    expect(
      describeBooks([book("One Piece", 1), book("One Piece", 2), book("One Piece", 3)]),
    ).toEqual(["One Piece 1 à 3"]);
  });

  test("writes a one-shot without number", () => {
    expect(describeBooks([book("Adieu Eri", 0)])).toEqual(["Adieu Eri"]);
  });

  test("writes a lone volume as its number", () => {
    expect(describeBooks([book("Death Note", 1)])).toEqual(["Death Note 1"]);
  });

  test("keeps gaps between volumes", () => {
    expect(describeBooks([book("Kingdom", 1), book("Kingdom", 2), book("Kingdom", 4)])).toEqual([
      "Kingdom 1 à 2, 4",
    ]);
  });

  test("separates editions of the same series", () => {
    expect(
      describeBooks([
        book("Berserk", 1),
        book("Berserk", 2),
        book("Berserk", 1, "Edition collector"),
      ]),
    ).toEqual(["Berserk 1 à 2", "Berserk (Edition collector) 1"]);
  });

  test("lists series in row order", () => {
    expect(describeBooks([book("Young GTO", 1), book("GTO", 1)])).toEqual(["Young GTO 1", "GTO 1"]);
  });
});

describe("shelvesUsed", () => {
  const row = { books: [], width: 0, maxHeight: 0, maxDepth: 0 };
  const compartment = (zone: "upper" | "lower") => ({
    bookcase: 0,
    zone,
    front: row,
    back: null,
    neededHeight: 20,
    height: 20,
    bottom: 0,
  });

  test("counts the fixed shelf plus one shelf between compartments of a zone", () => {
    const bookcase: BookcaseLayout = {
      index: 0,
      compartments: [
        compartment("upper"),
        compartment("upper"),
        compartment("upper"),
        compartment("lower"),
      ],
    };

    expect(shelvesUsed(bookcase)).toBe(3);
  });

  test("counts only the fixed shelf for an empty bookcase", () => {
    expect(shelvesUsed({ index: 0, compartments: [] })).toBe(1);
  });
});

describe("bookGroups", () => {
  test("keeps the cover of the first volume of each group", () => {
    const groups = bookGroups([book("Kingdom", 3), book("Kingdom", 4), book("Ajin", 1)]);

    expect(groups).toEqual([
      { seriesTitle: "Kingdom", text: "Kingdom 3 à 4", cover: "Kingdom-3.jpg", count: 2 },
      { seriesTitle: "Ajin", text: "Ajin 1", cover: "Ajin-1.jpg", count: 1 },
    ]);
  });
});

describe("shelfPositions", () => {
  const row = { books: [], width: 0, maxHeight: 0, maxDepth: 0 };
  const compartment = (zone: "upper" | "lower", bottom: number, height: number) => ({
    bookcase: 0,
    zone,
    front: row,
    back: null,
    neededHeight: 20,
    height,
    bottom,
  });

  test("lists the underside of every shelf from the floor, fixed one included", () => {
    const bookcase: BookcaseLayout = {
      index: 0,
      compartments: [
        compartment("upper", 133.2, 56.8),
        compartment("upper", 75.6, 56),
        compartment("lower", 35.2, 38.8),
        compartment("lower", 0, 33.6),
      ],
    };

    expect(shelfPositions(bookcase, DEFAULT_SETTINGS)).toEqual([
      { position: 33.6, fixed: false },
      { position: 74, fixed: true },
      { position: 131.6, fixed: false },
    ]);
  });

  test("lists only the fixed shelf for an empty bookcase", () => {
    expect(shelfPositions({ index: 0, compartments: [] }, DEFAULT_SETTINGS)).toEqual([
      { position: 74, fixed: true },
    ]);
  });
});
