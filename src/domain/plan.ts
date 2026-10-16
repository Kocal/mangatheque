import type { BookcaseLayout } from "./layout.ts";
import { zoneHeights } from "./settings.ts";
import type { Settings } from "./settings.ts";
import type { Book } from "./types.ts";

function ranges(numbers: number[]): string {
  const parts: string[] = [];
  let start = numbers[0];
  let previous = numbers[0];
  for (const n of [...numbers.slice(1), Number.NaN]) {
    if (n === previous + 1) {
      previous = n;
      continue;
    }
    parts.push(start === previous ? `${start}` : `${start} à ${previous}`);
    start = n;
    previous = n;
  }
  return parts.join(", ");
}

export interface BookGroup {
  seriesTitle: string;
  text: string;
  cover: string | null;
  count: number;
}

export function bookGroups(books: Book[]): BookGroup[] {
  const groups: { label: string; first: Book; numbers: number[] }[] = [];
  for (const book of books) {
    const label = book.editionTitle
      ? `${book.seriesTitle} (${book.editionTitle})`
      : book.seriesTitle;
    const last = groups.at(-1);
    if (last?.label === label) {
      last.numbers.push(book.number);
    } else {
      groups.push({ label, first: book, numbers: [book.number] });
    }
  }
  return groups.map((g) => ({
    seriesTitle: g.first.seriesTitle,
    text:
      g.numbers.length === 1 && g.numbers[0] === 0 ? g.label : `${g.label} ${ranges(g.numbers)}`,
    cover: g.first.cover,
    count: g.numbers.length,
  }));
}

export function describeBooks(books: Book[]): string[] {
  return bookGroups(books).map((g) => g.text);
}

export function shelvesUsed(bookcase: BookcaseLayout): number {
  const movable = (["upper", "lower"] as const)
    .map((zone) => bookcase.compartments.filter((c) => c.zone === zone).length)
    .reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  return movable + 1;
}

export interface ShelfPosition {
  position: number;
  fixed: boolean;
}

export function shelfPositions(bookcase: BookcaseLayout, settings: Settings): ShelfPosition[] {
  const movable = (["upper", "lower"] as const).flatMap((zone) =>
    bookcase.compartments
      .filter((c) => c.zone === zone)
      .slice(1)
      .map((c) => ({ position: Math.round((c.bottom + c.height) * 10) / 10, fixed: false })),
  );
  return [...movable, { position: zoneHeights(settings).lower, fixed: true }].sort(
    (a, b) => a.position - b.position,
  );
}

export function spineLabel(book: Book, maxChars: number): string {
  const text = book.number === 0 ? book.seriesTitle : `${book.number} · ${book.seriesTitle}`;
  return text.length > maxChars ? `${text.slice(0, Math.max(0, maxChars - 1))}…` : text;
}
