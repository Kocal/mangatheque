import { readFile } from "node:fs/promises";
import { fetchKinds, fetchPublicPage, writeCollection } from "./lib/mangacollec-http.ts";
import { fromApiResponse } from "./lib/mangacollec.ts";

const [file, user = "kocal"] = process.argv.slice(2);
if (!file) {
  console.error(
    "Usage : node scripts/import-collection.ts <réponse de /v2/users/me/collection> [pseudo]",
  );
  process.exit(1);
}

const response: unknown = JSON.parse(await readFile(file, "utf8"));
const { token } = await fetchPublicPage(user);
const kinds = await fetchKinds(token);

await writeCollection(fromApiResponse(user, response, kinds, new Date().toISOString()));
