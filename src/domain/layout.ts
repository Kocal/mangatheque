import { CompartmentFiller, fillRow, neededHeightOf, toRow } from "./compartment.ts";
import type { Filling, Row } from "./compartment.ts";
import { zoneHeights } from "./settings.ts";
import { assignShelfHeights } from "./shelves.ts";
import type { Settings, Zone } from "./settings.ts";
import type { Book, Unit } from "./types.ts";

const EPSILON = 1e-9;
const DOUBLE_COST = 1e9;
const BACK_BOOK_COST = 1e3;
const COMPARTMENT_COST = 1;

const NEXT_ZONE = -1;
const NEXT_BOOKCASE = -2;
const SKIP = -3;

export interface Compartment {
  bookcase: number;
  zone: Zone;
  front: Row;
  back: Row | null;
  neededHeight: number;
  height: number;
  bottom: number;
}

export interface BookcaseLayout {
  frozen?: boolean;
  index: number;
  compartments: Compartment[];
}

export interface Layout {
  bookcases: BookcaseLayout[];
  doubleCount: number;
  placedCount: number;
  overflow: Book[];
}

interface Option {
  end: number;
  filling: Filling;
  steps: number;
  cost: number;
}

function sumThickness(books: Book[]): number {
  return books.reduce((sum, book) => sum + book.dims.thickness, 0);
}

function chunk(unit: Unit, sizeOf: (rest: Book[]) => number): Unit[] {
  const chunks: Unit[] = [];
  let rest = unit.books;
  while (rest.length > 0) {
    const size = Math.max(1, sizeOf(rest));
    const books = rest.slice(0, size);
    chunks.push({
      ...unit,
      key: `${unit.key}#${chunks.length + 1}`,
      books,
      thickness: sumThickness(books),
    });
    rest = rest.slice(size);
  }
  return chunks;
}

const rowWidthOf = (settings: Settings) => settings.innerWidth - settings.rowSlack;

export function splitLongUnits(units: Unit[], settings: Settings): Unit[] {
  const rowWidth = rowWidthOf(settings);
  const twoRows = (books: Book[]) => {
    const front = fillRow(books, rowWidth);
    return front + fillRow(books.slice(front), rowWidth);
  };
  return units.flatMap((unit) =>
    twoRows(unit.books) >= unit.books.length ? [unit] : chunk(unit, twoRows),
  );
}

export function splitIntoRows(unit: Unit, settings: Settings): Unit[] {
  const rowWidth = rowWidthOf(settings);
  return chunk(unit, (rest) => fillRow(rest, rowWidth));
}

function optionsFrom(units: Unit[], start: number, settings: Settings, maxSteps: number): Option[] {
  const filler = new CompartmentFiller(settings);
  const options: Option[] = [];
  for (let end = start + 1; end <= units.length; end++) {
    if (!filler.add(units[end - 1])) {
      break;
    }
    const filling = filler.single() ?? filler.double();
    if (!filling) {
      break;
    }
    const steps = Math.max(
      1,
      Math.ceil((filling.neededHeight + settings.shelfThickness) / settings.holePitch - EPSILON),
    );
    if (steps > maxSteps) {
      break;
    }
    const backBooks = filling.back?.books.length ?? 0;
    const cost = (filling.back ? DOUBLE_COST : 0) + backBooks * BACK_BOOK_COST + COMPARTMENT_COST;
    options.push({ end, filling, steps, cost });
  }
  return options;
}

function planBookcases(
  rawUnits: Unit[],
  settings: Settings,
  indexes: number[],
): { bookcases: BookcaseLayout[]; overflow: Book[] } {
  const bookcases: BookcaseLayout[] = indexes.map((index) => ({ index, compartments: [] }));

  if (indexes.length === 0 || !(settings.holePitch > 0)) {
    return { bookcases, overflow: rawUnits.flatMap((u) => u.books) };
  }

  const heights = zoneHeights(settings);
  const caps = [heights.upper, heights.lower].map((z) =>
    Math.max(0, Math.floor((z + settings.shelfThickness) / settings.holePitch + EPSILON)),
  );
  const maxSteps = Math.max(...caps);
  const maxMovable = Math.max(0, Math.floor(settings.maxShelves) - 1);

  const units = splitLongUnits(rawUnits, settings).flatMap((unit) =>
    unit.books.length > 1 && optionsFrom([unit], 0, settings, maxSteps).length === 0
      ? splitIntoRows(unit, settings)
      : [unit],
  );

  const N = units.length;
  const B = indexes.length;
  const M = maxMovable + 1;
  const H = Math.max(...caps) + 1;
  const index = (i: number, b: number, z: number, m: number, h: number) =>
    (((i * B + b) * 2 + z) * M + m) * H + h;
  const size = (N + 1) * B * 2 * M * H;

  const options = units.map((_, i) => optionsFrom(units, i, settings, maxSteps));
  // Ties go to the layout that places units earlier; the whole term stays below one compartment.
  const lateCost = COMPARTMENT_COST / (B * (M + 1) * N + 1);
  const cost = new Float64Array(size).fill(Infinity);
  const prev = new Int32Array(size).fill(-1);
  const action = new Int32Array(size);

  const relax = (target: number, value: number, from: number, how: number) => {
    if (value < cost[target]) {
      cost[target] = value;
      prev[target] = from;
      action[target] = how;
    }
  };

  cost[index(0, 0, 0, 0, 0)] = 0;
  let reached = 0;

  for (let i = 0; i <= N; i++) {
    for (let b = 0; b < B; b++) {
      for (let z = 0; z < 2; z++) {
        for (let m = 0; m < M; m++) {
          for (let h = 0; h < H; h++) {
            const state = index(i, b, z, m, h);
            const current = cost[state];
            if (current === Infinity) {
              continue;
            }
            reached = i;
            if (i < N && options[i].length === 0) {
              relax(index(i + 1, b, z, m, h), current, state, SKIP);
            } else if (i < N) {
              const nextM = m + (h > 0 ? 1 : 0);
              if (nextM <= maxMovable) {
                options[i].forEach((option, k) => {
                  if (h + option.steps <= caps[z]) {
                    relax(
                      index(option.end, b, z, nextM, h + option.steps),
                      current + option.cost + (N - option.end) * lateCost,
                      state,
                      k,
                    );
                  }
                });
              }
            }
            if (z === 0) {
              relax(index(i, b, 1, m, 0), current, state, NEXT_ZONE);
            } else if (b + 1 < B) {
              relax(index(i, b + 1, 0, 0, 0), current, state, NEXT_BOOKCASE);
            }
          }
        }
      }
    }
  }

  let best = -1;
  for (let state = index(reached, 0, 0, 0, 0); state < index(reached + 1, 0, 0, 0, 0); state++) {
    if (cost[state] !== Infinity && (best === -1 || cost[state] < cost[best])) {
      best = state;
    }
  }

  const path: number[] = [];
  for (let state = best; prev[state] !== -1; state = prev[state]) {
    path.push(state);
  }
  path.reverse();

  const overflow: Book[] = [];
  for (const state of path) {
    const from = prev[state];
    const how = action[state];
    const i = Math.floor(from / (B * 2 * M * H));
    const b = Math.floor(from / (2 * M * H)) % B;
    const z = Math.floor(from / (M * H)) % 2;
    if (how === SKIP) {
      overflow.push(...units[i].books);
    } else if (how >= 0) {
      const { filling } = options[i][how];
      bookcases[b].compartments.push({
        bookcase: indexes[b],
        zone: z === 0 ? "upper" : "lower",
        front: filling.front,
        back: filling.back,
        neededHeight: filling.neededHeight,
        height: filling.neededHeight,
        bottom: 0,
      });
    }
  }
  for (const unit of units.slice(reached)) {
    overflow.push(...unit.books);
  }

  assignShelfHeights(bookcases, settings);
  return { bookcases, overflow };
}

export interface FrozenCompartment {
  zone: Zone;
  front: string[];
  back: string[] | null;
  height: number;
  bottom: number;
}

export interface FrozenBookcase {
  index: number;
  compartments: FrozenCompartment[];
}

export function freezeBookcase(bookcase: BookcaseLayout): FrozenBookcase {
  return {
    index: bookcase.index,
    compartments: bookcase.compartments.map((c) => ({
      zone: c.zone,
      front: c.front.books.map((b) => b.id),
      back: c.back?.books.map((b) => b.id) ?? null,
      height: Math.round(c.height * 100) / 100,
      bottom: Math.round(c.bottom * 100) / 100,
    })),
  };
}

function thaw(
  frozen: FrozenBookcase,
  books: Map<string, Book>,
  settings: Settings,
): BookcaseLayout {
  const rowOf = (ids: string[]) => toRow(ids.flatMap((id) => books.get(id) ?? []));
  return {
    index: frozen.index,
    frozen: true,
    compartments: frozen.compartments.map((c) => {
      const front = rowOf(c.front);
      const back = c.back ? rowOf(c.back) : null;
      return {
        bookcase: frozen.index,
        zone: c.zone,
        front,
        back,
        neededHeight: neededHeightOf(front, back, settings),
        height: c.height,
        bottom: c.bottom,
      };
    }),
  };
}

export function computeLayout(
  units: Unit[],
  settings: Settings,
  frozen: FrozenBookcase[] = [],
): Layout {
  const bookcaseCount = Math.max(0, Math.floor(settings.bookcaseCount));
  const kept = frozen.filter((f) => f.index < bookcaseCount);
  const frozenIds = new Set(
    kept.flatMap((f) => f.compartments.flatMap((c) => [...c.front, ...(c.back ?? [])])),
  );
  const books = new Map(units.flatMap((u) => u.books.map((b) => [b.id, b] as const)));
  const freeIndexes = Array.from({ length: bookcaseCount }, (_, i) => i).filter(
    (i) => !kept.some((f) => f.index === i),
  );
  const freeUnits = units.flatMap((unit) => {
    const rest = unit.books.filter((b) => !frozenIds.has(b.id));
    if (rest.length === unit.books.length) {
      return [unit];
    }
    return rest.length > 0 ? [{ ...unit, books: rest, thickness: sumThickness(rest) }] : [];
  });

  const planned = planBookcases(freeUnits, settings, freeIndexes);
  const bookcases = [...kept.map((f) => thaw(f, books, settings)), ...planned.bookcases].sort(
    (a, b) => a.index - b.index,
  );

  const compartments = bookcases.flatMap((bookcase) => bookcase.compartments);
  return {
    bookcases,
    doubleCount: compartments.filter((c) => c.back).length,
    placedCount: compartments.reduce(
      (sum, c) => sum + c.front.books.length + (c.back?.books.length ?? 0),
      0,
    ),
    overflow: planned.overflow,
  };
}
