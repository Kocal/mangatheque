import type { Collection, DimensionsCache, Volume } from "../../src/domain/types.ts";

export interface FetchOptions {
  series?: string[];
  onePerEdition?: boolean;
}

export function volumesToFetch(
  collection: Collection,
  cache: DimensionsCache,
  { series, onePerEdition = false }: FetchOptions,
): { series: string; volume: Volume }[] {
  return collection.series
    .filter((s) => !series || series.includes(s.title))
    .flatMap((s) =>
      s.editions
        .flatMap((e) => {
          if (onePerEdition) {
            return e.volumes.some((v) => cache[v.id]) ? [] : e.volumes.slice(0, 1);
          }
          return e.volumes.filter((v) => !cache[v.id]);
        })
        .map((volume) => ({ series: s.title, volume })),
    );
}
