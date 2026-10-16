import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { SAMPLE_SERIES } from "../src/data/sample.ts";
import type { Collection, DimensionsCache } from "../src/domain/types.ts";
import { isbn13ToAsin, isCaptchaPage, parseAmazonDimensions } from "./lib/amazon.ts";
import { volumesToFetch } from "./lib/selection.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

const collectionFile = new URL("../data/collection.json", import.meta.url);
const cacheFile = new URL("../data/dimensions.json", import.meta.url);
const sampleOnly = process.argv.includes("--sample");

const collection = JSON.parse(await readFile(collectionFile, "utf8")) as Collection;
const cache: DimensionsCache = await readFile(cacheFile, "utf8").then(
  (text) => JSON.parse(text) as DimensionsCache,
  () => ({}),
);

async function saveCache(): Promise<void> {
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(cacheFile, `${JSON.stringify(sorted, null, 2)}\n`);
}

const todo = volumesToFetch(collection, cache, {
  series: sampleOnly ? SAMPLE_SERIES : undefined,
  onePerEdition: process.argv.includes("--one-per-edition"),
});

console.log(`${todo.length} tomes à charger`);

let found = 0;
for (const [index, { series, volume }] of todo.entries()) {
  const label = `[${index + 1}/${todo.length}] ${series} t.${volume.number}`;
  const asin = volume.asin ?? (volume.isbn ? isbn13ToAsin(volume.isbn) : null);
  if (!asin) {
    console.log(`${label} : ni ASIN ni ISBN, ignoré`);
    continue;
  }

  const response = await fetch(`https://www.amazon.fr/dp/${asin}`, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9" },
  });
  const html = await response.text();

  if (isCaptchaPage(html)) {
    await saveCache();
    console.error(
      `${label} : Amazon demande un captcha, arrêt. Relance plus tard, les tomes déjà chargés sont gardés.`,
    );
    process.exit(2);
  }

  const dims = parseAmazonDimensions(html);
  if (dims) {
    cache[volume.id] = dims;
    found++;
    await saveCache();
    console.log(`${label} : ${dims.width} x ${dims.thickness} x ${dims.height} cm`);
  } else {
    console.log(`${label} : pas de dimensions (HTTP ${response.status})`);
  }

  await sleep(3000 + Math.random() * 1000);
}

console.log(`${found} dimensions ajoutées -> data/dimensions.json`);
