import { fetchKinds, fetchPublicPage, writeCollection } from "./lib/mangacollec-http.ts";
import { toCollection } from "./lib/mangacollec.ts";

const user = process.argv[2] ?? "kocal";

const { token, store } = await fetchPublicPage(user);
const kinds = await fetchKinds(token);

await writeCollection(toCollection(user, store, kinds, new Date().toISOString()));
console.warn(
  "La page publique de Manga Collec peut être en retard. Pour une copie à jour : pbpaste | pnpm import:collection",
);
