import { mkdir, writeFile } from "node:fs/promises";
import type { Collection } from "../../src/domain/types.ts";
import { extractServerData, type Kind } from "./mangacollec.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

export async function fetchPublicPage(user: string): Promise<{ token: string; store: unknown }> {
  const page = await fetch(`https://www.mangacollec.com/user/${user}/collection`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!page.ok) {
    throw new Error(`Manga Collec a répondu ${page.status}`);
  }
  return extractServerData(await page.text());
}

export async function fetchKinds(token: string): Promise<Kind[]> {
  const response = await fetch("https://api.mangacollec.com/v2/kinds", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
  });
  if (!response.ok) {
    throw new Error(`L'API des thèmes a répondu ${response.status}`);
  }
  return ((await response.json()) as { kinds: Kind[] }).kinds;
}

export async function writeCollection(collection: Collection): Promise<void> {
  const dataDir = new URL("../../data/", import.meta.url);
  const volumes = collection.series.flatMap((s) => s.editions.flatMap((e) => e.volumes)).length;
  await mkdir(dataDir, { recursive: true });
  await writeFile(new URL("collection.json", dataDir), `${JSON.stringify(collection, null, 2)}\n`);
  console.log(`${collection.series.length} séries, ${volumes} tomes -> data/collection.json`);
}
