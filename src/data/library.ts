import collectionJson from "../../data/collection.json";
import dimensionsJson from "../../data/dimensions.json";
import type { Collection, DimensionsCache } from "../domain/types.ts";
import { SAMPLE_SERIES } from "./sample.ts";

export const COLLECTION = collectionJson as unknown as Collection;
export const DIMENSIONS = dimensionsJson as DimensionsCache;

export const SAMPLE: Collection = {
  ...COLLECTION,
  series: COLLECTION.series.filter((s) => SAMPLE_SERIES.includes(s.title)),
};

export function volumeCount(collection: Collection): number {
  return collection.series.reduce(
    (sum, s) => sum + s.editions.reduce((n, e) => n + e.volumes.length, 0),
    0,
  );
}
