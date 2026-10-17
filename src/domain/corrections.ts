import type { Collection, Correction, Series, Volume } from "./types.ts";

type Addition = Extract<Correction, { add: string }>;

function manualVolume(title: string, number: number): Volume {
  return { id: `manual:${title}:${number}`, number, isbn: null, asin: null, imageUrl: null };
}

function remove(list: Series[], title: string, numbers?: number[]): Series[] {
  return list.flatMap((series) => {
    if (series.title !== title) {
      return [series];
    }
    if (!numbers) {
      return [];
    }
    const editions = series.editions
      .map((e) => ({ ...e, volumes: e.volumes.filter((v) => !numbers.includes(v.number)) }))
      .filter((e) => e.volumes.length > 0);
    return editions.length > 0 ? [{ ...series, editions }] : [];
  });
}

function add(list: Series[], { add: title, audience, volumes }: Addition): Series[] {
  const existing = list.find((s) => s.title === title);
  if (!existing) {
    const edition = {
      id: `manual:${title}`,
      title: null,
      volumes: volumes.map((n) => manualVolume(title, n)),
    };
    return [...list, { id: `manual:${title}`, title, audience, editions: [edition] }];
  }

  const owned = new Set(existing.editions.flatMap((e) => e.volumes.map((v) => v.number)));
  const missing = volumes.filter((n) => !owned.has(n)).map((n) => manualVolume(title, n));
  const [main, ...others] = existing.editions;
  return list.map((series) =>
    series === existing
      ? { ...series, editions: [{ ...main, volumes: [...main.volumes, ...missing] }, ...others] }
      : series,
  );
}

export function applyCorrections(collection: Collection, corrections: Correction[]): Collection {
  const series = corrections.reduce(
    (list, correction) =>
      "remove" in correction
        ? remove(list, correction.remove, correction.volumes)
        : add(list, correction),
    collection.series,
  );
  return { ...collection, series };
}
