import collectionJson from "../../data/collection.json";
import dimensionsJson from "../../data/dimensions.json";
import frozenJson from "../../data/frozen.json";
import { applyCorrections } from "../domain/corrections.ts";
import type { FrozenBookcase } from "../domain/layout.ts";
import type { Collection, DimensionsCache } from "../domain/types.ts";
import { CORRECTIONS } from "./corrections.ts";
import { SAMPLE_SERIES } from "./sample.ts";

export const COLLECTION = applyCorrections(collectionJson as unknown as Collection, CORRECTIONS);
export const DIMENSIONS = dimensionsJson as DimensionsCache;
export const FROZEN = frozenJson as unknown as FrozenBookcase[];

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
