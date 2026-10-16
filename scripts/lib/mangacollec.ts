import { AUDIENCES } from "../../src/domain/types.ts";
import type { Audience, Collection, Edition, Series } from "../../src/domain/types.ts";

interface RawSeries {
  id: string;
  title: string;
  kinds_ids: string[];
}

interface RawEdition {
  id: string;
  title: string | null;
  series_id: string;
}

interface RawVolume {
  id: string;
  number: number;
  isbn: string | null;
  asin: string | null;
  edition_id: string;
  image_url?: string | null;
}

interface RawStore {
  series: { data: Record<string, RawSeries> };
  editions: { data: Record<string, RawEdition> };
  volumes: { data: Record<string, RawVolume> };
  publicCollection: Record<string, [[unknown[], { volume_id: string }[]], ...unknown[]]>;
}

export interface Kind {
  id: string;
  title: string;
}

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function readJsonLine(html: string, key: string): unknown {
  const line = html.split("\n").find((l) => l.trimStart().startsWith(`${key}: `));
  if (!line) {
    throw new Error(`${key} introuvable dans la page Manga Collec`);
  }
  return JSON.parse(
    line
      .trim()
      .slice(key.length + 2)
      .replace(/,$/, ""),
  );
}

export function extractServerData(html: string): { token: string; store: unknown } {
  const session = readJsonLine(html, "SESSION_TOKEN") as { access_token: string };
  return { token: session.access_token, store: readJsonLine(html, "DATA_STORE") };
}

export function toCollection(
  user: string,
  rawStore: unknown,
  kinds: Kind[],
  fetchedAt: string,
): Collection {
  const store = rawStore as RawStore;
  const owned = store.publicCollection[user]?.[0]?.[1];
  if (!owned) {
    throw new Error(`Collection de ${user} introuvable dans la page`);
  }

  const kindTitles = new Map(kinds.map((k) => [k.id, k.title]));
  const seriesById = new Map<string, Series>();

  for (const { volume_id } of owned) {
    const volume = store.volumes.data[volume_id];
    const edition = store.editions.data[volume.edition_id];
    const raw = store.series.data[edition.series_id];

    let series = seriesById.get(raw.id);
    if (!series) {
      const audience = raw.kinds_ids
        .map((id) => kindTitles.get(id))
        .find((title): title is Audience => AUDIENCES.includes(title as Audience));
      series = { id: raw.id, title: raw.title, audience: audience ?? null, editions: [] };
      seriesById.set(raw.id, series);
    }

    let target: Edition | undefined = series.editions.find((e) => e.id === edition.id);
    if (!target) {
      target = { id: edition.id, title: edition.title, volumes: [] };
      series.editions.push(target);
    }
    target.volumes.push({
      id: volume.id,
      number: volume.number,
      isbn: volume.isbn,
      asin: volume.asin,
      imageUrl: volume.image_url ?? null,
    });
  }

  const series = [...seriesById.values()].sort((a, b) => collator.compare(a.title, b.title));
  for (const s of series) {
    s.editions.sort((a, b) => {
      if (a.title === null || b.title === null) {
        return a.title === b.title ? 0 : a.title === null ? -1 : 1;
      }
      return collator.compare(a.title, b.title);
    });
    for (const e of s.editions) {
      e.volumes.sort((a, b) => a.number - b.number);
    }
  }

  return { user, fetchedAt, series };
}
