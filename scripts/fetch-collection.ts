import { mkdir, writeFile } from "node:fs/promises";
import { extractServerData, toCollection, type Kind } from "./lib/mangacollec.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

const user = process.argv[2] ?? "kocal";
const dataDir = new URL("../data/", import.meta.url);

const page = await fetch(`https://www.mangacollec.com/user/${user}/collection`, {
  headers: { "User-Agent": USER_AGENT },
});
if (!page.ok) {
  throw new Error(`Manga Collec a répondu ${page.status}`);
}
const { token, store } = extractServerData(await page.text());

const kindsResponse = await fetch("https://api.mangacollec.com/v2/kinds", {
  headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
});
if (!kindsResponse.ok) {
  throw new Error(`L'API des thèmes a répondu ${kindsResponse.status}`);
}
const { kinds } = (await kindsResponse.json()) as { kinds: Kind[] };

const collection = toCollection(user, store, kinds, new Date().toISOString());
const volumes = collection.series.flatMap((s) => s.editions.flatMap((e) => e.volumes)).length;

await mkdir(dataDir, { recursive: true });
await writeFile(new URL("collection.json", dataDir), `${JSON.stringify(collection, null, 2)}\n`);
console.log(`${collection.series.length} séries, ${volumes} tomes -> data/collection.json`);
