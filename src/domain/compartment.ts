import type { Settings } from "./settings.ts";
import type { Book, Unit } from "./types.ts";

const EPSILON = 1e-9;

export interface Row {
  books: Book[];
  width: number;
  maxHeight: number;
  maxDepth: number;
}

export interface Filling {
  front: Row;
  back: Row | null;
  neededHeight: number;
}

function widthOf(books: Book[]): number {
  return books.reduce((sum, book) => sum + book.dims.thickness, 0);
}

export function toRow(books: Book[]): Row {
  return {
    books,
    width: widthOf(books),
    maxHeight: Math.max(0, ...books.map((b) => b.dims.height)),
    maxDepth: Math.max(0, ...books.map((b) => b.dims.width)),
  };
}

export function neededHeightOf(front: Row, back: Row | null, settings: Settings): number {
  const tallest = back
    ? Math.max(front.maxHeight, settings.riserHeight + back.maxHeight)
    : front.maxHeight;
  return tallest + settings.headroom;
}

export function fillRow(books: Book[], rowWidth: number): number {
  let width = 0;
  let count = 0;
  for (const book of books) {
    if (width + book.dims.thickness > rowWidth + EPSILON) {
      break;
    }
    width += book.dims.thickness;
    count++;
  }
  return count;
}

export class CompartmentFiller {
  private readonly settings: Settings;
  private readonly rowWidth: number;
  private front: Book[] = [];
  private back: Book[] = [];
  private frontWidth = 0;
  private backWidth = 0;

  constructor(settings: Settings) {
    this.settings = settings;
    this.rowWidth = settings.innerWidth - settings.rowSlack;
  }

  add(unit: Unit): boolean {
    const fits = (used: number, extra: number) => used + extra <= this.rowWidth + EPSILON;

    if (this.back.length === 0 && fits(this.frontWidth, unit.thickness)) {
      this.front.push(...unit.books);
      this.frontWidth += unit.thickness;
      return true;
    }

    if (this.back.length === 0 && unit.thickness > this.rowWidth + EPSILON) {
      const inFront = fillRow(unit.books, this.rowWidth - this.frontWidth);
      const rest = unit.books.slice(inFront);
      const restWidth = widthOf(rest);
      if (!fits(0, restWidth)) {
        return false;
      }
      this.front.push(...unit.books.slice(0, inFront));
      this.frontWidth += unit.thickness - restWidth;
      this.back.push(...rest);
      this.backWidth = restWidth;
      return true;
    }

    if (unit.thickness <= this.rowWidth + EPSILON && fits(this.backWidth, unit.thickness)) {
      this.back.push(...unit.books);
      this.backWidth += unit.thickness;
      return true;
    }

    return false;
  }

  single(): Filling | null {
    if (this.back.length > 0 || this.front.length === 0) {
      return null;
    }
    const front = toRow([...this.front]);
    return { front, back: null, neededHeight: neededHeightOf(front, null, this.settings) };
  }

  double(): Filling | null {
    if (this.back.length === 0) {
      return null;
    }
    const front = toRow([...this.front]);
    const back = toRow([...this.back]);
    if (front.maxDepth + back.maxDepth > this.settings.innerDepth + EPSILON) {
      return null;
    }
    return { front, back, neededHeight: neededHeightOf(front, back, this.settings) };
  }
}
