import { readFile } from "node:fs/promises";
import { text } from "node:stream/consumers";
import { fetchKinds, fetchPublicPage, writeCollection } from "./lib/mangacollec-http.ts";
import { fromApiResponse } from "./lib/mangacollec.ts";

const [file, user = "kocal"] = process.argv.slice(2);
if (!file) {
  console.error(
    "Usage : node scripts/import-collection.ts <réponse de /v2/users/me/collection | -> [pseudo]",
  );
  console.error(
    "Avec -, la réponse est lue sur l'entrée standard : pbpaste | pnpm import:collection",
  );
  process.exit(1);
}

function parse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const response = parse(file === "-" ? await text(process.stdin) : await readFile(file, "utf8"));
if (!Array.isArray((response as { possessions?: unknown } | null)?.possessions)) {
  console.error(
    "Ce n'est pas la réponse de users/me/collection. Copie-la depuis l'onglet Réseau de DevTools.",
  );
  process.exit(1);
}

const { token } = await fetchPublicPage(user);
const kinds = await fetchKinds(token);

await writeCollection(fromApiResponse(user, response, kinds, new Date().toISOString()));
