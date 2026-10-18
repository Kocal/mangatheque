import { describe, expect, test } from "vite-plus/test";
import type { Collection } from "../../src/domain/types.ts";
import { volumesToFetch } from "./selection.ts";

const volume = (id: string, number: number) => ({
  id,
  number,
  isbn: null,
  asin: `asin-${id}`,
  imageUrl: null,
});

const collection: Collection = {
  user: "test",
  fetchedAt: "now",
  series: [
    {
      id: "kingdom",
      title: "Kingdom",
      audience: "Seinen",
      editions: [{ id: "k", title: null, volumes: [volume("k1", 1), volume("k2", 2)] }],
    },
    {
      id: "monster",
      title: "Monster",
      audience: "Seinen",
      editions: [{ id: "m", title: null, volumes: [volume("m1", 1), volume("m2", 2)] }],
    },
  ],
};

const ids = (list: ReturnType<typeof volumesToFetch>) => list.map((item) => item.volume.id);

describe("volumesToFetch", () => {
  test("skips volumes already in the cache", () => {
    expect(
      ids(volumesToFetch(collection, { k1: { width: 1, thickness: 1, height: 1 } }, {})),
    ).toEqual(["k2", "m1", "m2"]);
  });

  test("keeps only the listed series", () => {
    expect(ids(volumesToFetch(collection, {}, { series: ["Monster"] }))).toEqual(["m1", "m2"]);
  });

  test("takes one volume per edition without known dimensions", () => {
    const cache = { k2: { width: 1, thickness: 1, height: 1 } };

    expect(ids(volumesToFetch(collection, cache, { onePerEdition: true }))).toEqual(["m1"]);
  });
});
