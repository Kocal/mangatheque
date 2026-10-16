import { AUDIENCES } from "./types.ts";
import type {
  Audience,
  Book,
  Collection,
  Dimensions,
  DimensionsCache,
  Edition,
  Series,
  Unit,
  Universe,
} from "./types.ts";

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

interface Block {
  name: string;
  audience: Audience | null;
  members: Series[];
}

export function estimateDimensions(edition: Edition, dims: DimensionsCache = {}): Dimensions {
  const known = edition.volumes.flatMap((v) => (dims[v.id] ? [dims[v.id]] : []));
  if (known.length > 0) {
    const mean = (key: keyof Dimensions) =>
      known.reduce((sum, d) => sum + d[key], 0) / known.length;
    return { width: mean("width"), thickness: mean("thickness"), height: mean("height") };
  }
  const isDouble = /double/i.test(edition.title ?? "");
  return { width: 11.5, thickness: isDouble ? 2.9 : 1.8, height: 18 };
}

function volumeCount(series: Series): number {
  return series.editions.reduce((sum, edition) => sum + edition.volumes.length, 0);
}

function dominantAudience(members: Series[]): Audience | null {
  const weights = new Map<Audience, number>();
  for (const member of members) {
    if (member.audience) {
      weights.set(member.audience, (weights.get(member.audience) ?? 0) + volumeCount(member));
    }
  }
  let best: Audience | null = null;
  for (const audience of AUDIENCES) {
    const weight = weights.get(audience) ?? 0;
    if (weight > 0 && (best === null || weight > (weights.get(best) ?? 0))) {
      best = audience;
    }
  }
  return best;
}

function groupRank(audience: Audience | null): number {
  return audience === null ? AUDIENCES.length : AUDIENCES.indexOf(audience);
}

function buildBlocks(collection: Collection, universes: Universe[]): Block[] {
  const byTitle = new Map(collection.series.map((s) => [s.title, s]));
  const claimed = new Set<string>();
  const blocks: Block[] = [];

  for (const universe of universes) {
    const members = universe.series.flatMap((title) => {
      const found = byTitle.get(title);
      return found && !claimed.has(title) ? [found] : [];
    });
    if (members.length === 0) {
      continue;
    }
    members.forEach((m) => claimed.add(m.title));
    blocks.push({ name: universe.name, audience: dominantAudience(members), members });
  }

  for (const series of collection.series) {
    if (!claimed.has(series.title)) {
      blocks.push({ name: series.title, audience: series.audience, members: [series] });
    }
  }

  return blocks.sort(
    (a, b) => groupRank(a.audience) - groupRank(b.audience) || collator.compare(a.name, b.name),
  );
}

function booksOf(series: Series, dims: DimensionsCache): Book[] {
  return series.editions.flatMap((edition) =>
    [...edition.volumes]
      .sort((a, b) => a.number - b.number)
      .map((volume) => {
        const known = dims[volume.id];
        return {
          id: volume.id,
          seriesTitle: series.title,
          editionTitle: edition.title,
          number: volume.number,
          dims: known ?? estimateDimensions(edition, dims),
          estimated: !known,
          cover: volume.imageUrl,
        };
      }),
  );
}

export function buildUnits(
  collection: Collection,
  dims: DimensionsCache,
  universes: Universe[],
): Unit[] {
  const colorCounters = new Map<Audience | null, number>();

  return buildBlocks(collection, universes).flatMap((block) =>
    block.members.map((series) => {
      const books = booksOf(series, dims);
      const colorIndex = colorCounters.get(block.audience) ?? 0;
      colorCounters.set(block.audience, colorIndex + 1);
      return {
        key: series.id,
        seriesTitle: series.title,
        group: block.audience,
        books,
        thickness: books.reduce((sum, book) => sum + book.dims.thickness, 0),
        colorIndex,
      };
    }),
  );
}
