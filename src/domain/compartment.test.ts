import { describe, expect, test } from "vite-plus/test";
import { CompartmentFiller } from "./compartment.ts";
import { DEFAULT_SETTINGS } from "./settings.ts";
import { makeUnit } from "./test-helpers.ts";

const settings = {
  ...DEFAULT_SETTINGS,
  innerWidth: 11,
  rowSlack: 1,
  innerDepth: 26,
  riserHeight: 6,
  headroom: 1.5,
};

const ids = (books: { id: string }[] | undefined) => books?.map((b) => b.id);

describe("CompartmentFiller", () => {
  test("fits small units in a single front row", () => {
    const filler = new CompartmentFiller(settings);

    expect(filler.add(makeUnit("a", 2, 2))).toBe(true);
    expect(filler.add(makeUnit("b", 3, 2))).toBe(true);

    const filling = filler.single();
    expect(ids(filling?.front.books)).toEqual(["a-1", "a-2", "b-1", "b-2", "b-3"]);
    expect(filling?.front.width).toBe(10);
    expect(filling?.back).toBeNull();
    expect(filler.double()).toBeNull();
  });

  test("computes the needed height of a single row from its tallest book", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 1, 2, { height: 18 }));
    filler.add(makeUnit("b", 1, 2, { height: 21 }));

    expect(filler.single()?.neededHeight).toBe(22.5);
  });

  test("moves the next unit to the back row when the front is full", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 4, 2));

    expect(filler.add(makeUnit("b", 2, 2))).toBe(true);

    expect(filler.single()).toBeNull();
    const filling = filler.double();
    expect(ids(filling?.front.books)).toEqual(["a-1", "a-2", "a-3", "a-4"]);
    expect(ids(filling?.back?.books)).toEqual(["b-1", "b-2"]);
  });

  test("keeps the front row closed once the back row has started", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 4, 2));
    filler.add(makeUnit("b", 2, 2));

    filler.add(makeUnit("c", 1, 1));

    expect(ids(filler.double()?.front.books)).toEqual(["a-1", "a-2", "a-3", "a-4"]);
    expect(ids(filler.double()?.back?.books)).toEqual(["b-1", "b-2", "c-1"]);
  });

  test("splits a unit longer than a row between front and back", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 1, 2));

    expect(filler.add(makeUnit("long", 7, 2))).toBe(true);

    const filling = filler.double();
    expect(ids(filling?.front.books)).toEqual(["a-1", "long-1", "long-2", "long-3", "long-4"]);
    expect(ids(filling?.back?.books)).toEqual(["long-5", "long-6", "long-7"]);
  });

  test("refuses a unit that does not fit in the back row", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 5, 2));
    filler.add(makeUnit("b", 4, 2));

    expect(filler.add(makeUnit("c", 2, 2))).toBe(false);

    expect(ids(filler.double()?.back?.books)).toEqual(["b-1", "b-2", "b-3", "b-4"]);
  });

  test("refuses a unit longer than the two rows together", () => {
    const filler = new CompartmentFiller(settings);

    expect(filler.add(makeUnit("huge", 11, 2))).toBe(false);
    expect(filler.single()).toBeNull();
  });

  test("refuses a double row when the books are too deep", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 5, 2, { width: 15 }));
    filler.add(makeUnit("b", 1, 2, { width: 12 }));

    expect(filler.double()).toBeNull();
  });

  test("computes the needed height with the riser for a double row", () => {
    const filler = new CompartmentFiller(settings);
    filler.add(makeUnit("a", 5, 2, { height: 21 }));
    filler.add(makeUnit("b", 1, 2, { height: 18 }));

    expect(filler.double()?.neededHeight).toBe(25.5);
  });
});
