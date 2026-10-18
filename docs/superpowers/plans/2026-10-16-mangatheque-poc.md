# Mangathèque POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une appli Vue locale qui importe la collection Manga Collec, récupère les dimensions des tomes sur Amazon, calcule le rangement dans 4 Billy et l'affiche en vue réaliste avec un plan texte.

**Architecture:** Deux scripts Node produisent `data/collection.json` et `data/dimensions.json`. Un domaine TypeScript pur (`src/domain/`) transforme ces données en unités ordonnées puis en placement par programmation dynamique. L'interface Vue lit les JSON, appelle le domaine et dessine.

**Tech Stack:** Vite+ 1.3 (`vp`), Vue 3, TypeScript 6, Vitest via `vite-plus/test`, Node 24 (exécution TS native).

**Spec:** `docs/superpowers/specs/2026-10-16-mangatheque-poc-design.md`

## Global Constraints

- Imports Vite depuis `vite-plus`, tests depuis `vite-plus/test` (règle lint `vite-plus/prefer-vite-plus-imports`).
- Toutes les longueurs du domaine en centimètres, en `number`.
- Pas de commentaire dans le code sauf "pourquoi" non évident.
- `tsconfig` a `erasableSyntaxOnly` : pas d'`enum`, pas de propriétés de paramètres de constructeur.
- Pas de commit sans accord d'Hugo.
- Textes de l'interface en français.

## Review Focus

1. Une série plus longue que 2 rangées (Détective Conan, One Piece à terme) : découpée en morceaux de compartiment, jamais perdue.
2. Une collection qui ne rentre pas : les tomes en trop apparaissent dans `overflow`, rien ne plante.
3. Un tome sans ASIN ni ISBN, ou une page Amazon sans dimensions : dimensions estimées, marquées `estimated`.
4. Des réglages absurdes saisis dans l'interface (largeur 0, marche plus haute que le compartiment) : pas de boucle infinie, tout part en `overflow`.
5. Une série sans public visé hors univers : groupe "Sans public" en dernier.

---

### Task 1: Socle Vue + tests

**Files:**

- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Delete: `src/counter.ts`, `src/assets/*`, `public/icons.svg`
- Create: `src/main.ts` (réécrit), `src/App.vue`, `src/env.d.ts`, `src/domain/smoke.test.ts`

- [ ] `vp add vue` puis `vp add -D @vitejs/plugin-vue vue-tsc`
- [ ] `vite.config.ts` : `plugins: [vue()]`, `test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] }`
- [ ] Script `build` : `vue-tsc --noEmit && vp build`
- [ ] `vp test` passe, `vp build` passe

### Task 2: Types et ordre des unités

**Files:**

- Create: `src/domain/types.ts`, `src/domain/ordering.ts`, `src/domain/ordering.test.ts`, `src/data/universes.ts`

**Interfaces:**

- Produces:
  - `type Audience = 'Shōnen' | 'Seinen' | 'Shōjo' | 'Josei' | 'Kodomo'`, `AUDIENCES: Audience[]` dans cet ordre
  - `Collection`, `Series`, `Edition`, `Volume`, `Dimensions { width; thickness; height }`, `DimensionsCache = Record<string, Dimensions>`
  - `Universe { name: string; series: string[] }`
  - `Book { id; seriesTitle; editionTitle: string | null; number: number; dims: Dimensions; estimated: boolean }`
  - `Unit { key: string; seriesTitle: string; group: Audience | null; books: Book[]; thickness: number; colorIndex: number }`
  - `buildUnits(collection: Collection, dims: DimensionsCache, universes: Universe[]): Unit[]`
  - `estimateDimensions(edition: Edition): Dimensions`

Tests (`ordering.test.ts`) :

- [ ] `groups audiences in Shōnen, Seinen, Shōjo, Josei, Kodomo order then null`
- [ ] `sorts series with French collation inside a group` : `["Zelda", "Ajin", "Éclair"]` -> `["Ajin", "Éclair", "Zelda"]`
- [ ] `keeps universe series adjacent in list order` : universe `GTO = ["Young GTO", "GTO", "GTO Shonan 14 days"]`, plus "Kingdom" et "Ajin" en Seinen, "Ao Ashi" en Shōnen -> ordre Shōnen `Ao Ashi, Young GTO, GTO, GTO Shonan 14 days` (univers trié sous son nom "GTO")
- [ ] `gives a universe its most represented audience by volume count` : "GTO Shonan 14 days" sans public suit GTO
- [ ] `orders volumes by edition then number`
- [ ] `estimates dimensions when the ASIN is unknown` : 11.5 x 1.8 x 18, épaisseur 2.9 si titre d'édition contient "double" (insensible à la casse), `estimated: true`

### Task 3: Remplissage d'un compartiment

**Files:**

- Create: `src/domain/compartment.ts`, `src/domain/compartment.test.ts`

**Interfaces:**

- Consumes: `Unit`, `Book`, `Settings`
- Produces:
  - `Settings { innerWidth; innerDepth; innerHeight; shelfThickness; fixedShelfHeight; holePitch; riserHeight; headroom; rowSlack; bookcaseCount; maxShelves }`, `DEFAULT_SETTINGS` (valeurs du tableau de la spec, `bookcaseCount: 4`, `maxShelves: 6`)
  - `Row { books: Book[]; width: number; maxHeight: number; maxDepth: number }`
  - `Filling { front: Row; back: Row | null; neededHeight: number }`
  - `class CompartmentFiller` : `constructor(settings)`, `add(unit: Unit): boolean` (false = ne rentre plus, état inchangé), `single(): Filling | null`, `double(): Filling | null`

Règles : largeur utile d'une rangée = `innerWidth - rowSlack`. Une unité plus large qu'une rangée peut passer de l'avant à l'arrière ; une unité plus courte ne se coupe jamais. `neededHeight` simple = `maxHeight + headroom` ; double = `max(front.maxHeight, riserHeight + back.maxHeight) + headroom`. Double refusé si `front.maxDepth + back.maxDepth > innerDepth`.

Tests :

- [ ] `fits small units in a single front row`
- [ ] `moves the next unit to the back row when the front is full`
- [ ] `splits a unit longer than a row between front and back`
- [ ] `refuses a unit that does not fit in the back row`
- [ ] `refuses a double row when the books are too deep`
- [ ] `computes the needed height with the riser for a double row`

### Task 4: Placement global

**Files:**

- Create: `src/domain/layout.ts`, `src/domain/layout.test.ts`

**Interfaces:**

- Consumes: `CompartmentFiller`, `Unit`, `Settings`
- Produces:
  - `Compartment { bookcase: number; zone: 'upper' | 'lower'; front: Row; back: Row | null; neededHeight: number; height: number; bottom: number }` (`bottom` = position du plancher du compartiment depuis le fond intérieur)
  - `BookcaseLayout { index: number; compartments: Compartment[] }` (compartiments de haut en bas)
  - `Layout { bookcases: BookcaseLayout[]; doubleCount: number; placedCount: number; overflow: Book[] }`
  - `splitLongUnits(units: Unit[], settings): Unit[]` : unités plus larges que 2 rangées découpées en morceaux gloutons
  - `computeLayout(units: Unit[], settings: Settings): Layout`

Programmation dynamique sur l'état `(unité i, Billy b, zone z, compartiments k dans la Billy, hauteur consommée h en pas de trous)`. Zone haute = au-dessus de la planche fixe (`innerHeight - fixedShelfHeight - shelfThickness`), zone basse = `fixedShelfHeight`. Un compartiment de besoin `n` consomme `ceil((n + shelfThickness) / holePitch)` pas ; une zone offre `floor((hauteurZone + shelfThickness) / holePitch)` pas. `k + 1 <= maxShelves + 1`. Transitions : poser un compartiment (unités i..j, simple si possible sinon double), passer à la zone basse, passer à la Billy suivante. Coût lexicographique `(doubles, compartiments)`. Si l'état final n'est pas atteignable, garder le plus grand `i` atteint et mettre le reste dans `overflow`.

Tests :

- [ ] `places everything in single rows when it fits`
- [ ] `uses a double row only for a series longer than a row`
- [ ] `prefers more single compartments over a double one`
- [ ] `respects the lower zone height`
- [ ] `never exceeds maxShelves + 1 compartments per bookcase`
- [ ] `splits a series longer than two rows across compartments`
- [ ] `reports overflow when the collection does not fit`
- [ ] `does not hang with a zero inner width`

### Task 5: Hauteurs de planches alignées

**Files:**

- Create: `src/domain/shelves.ts`, `src/domain/shelves.test.ts`
- Modify: `src/domain/layout.ts` (appel en fin de `computeLayout`)

**Interfaces:**

- Produces: `assignShelfHeights(bookcases: BookcaseLayout[], settings): void` qui remplit `height` et `bottom`

Par zone, les Billy qui ont le même nombre de compartiments forment un groupe ; hauteur de chaque rang = max des besoins du groupe à ce rang ; si la somme tient, le groupe partage les mêmes hauteurs, sinon chaque Billy garde les siennes. L'espace restant de la zone est réparti également, arrondi au pas des trous.

Tests :

- [ ] `aligns shelves of bookcases with the same compartment count`
- [ ] `falls back to individual heights when the aligned heights do not fit`
- [ ] `spreads the free height evenly`

### Task 6: Scripts d'import

**Files:**

- Create: `scripts/lib/mangacollec.ts`, `scripts/lib/mangacollec.test.ts`, `scripts/fetch-collection.ts`, `scripts/lib/amazon.ts`, `scripts/lib/amazon.test.ts`, `scripts/fetch-dimensions.ts`, `src/data/sample.ts`
- Modify: `package.json` (scripts `fetch:collection`, `fetch:dimensions`)

**Interfaces:**

- Produces:
  - `extractServerData(html: string): { token: string; store: unknown }`
  - `toCollection(user: string, store: unknown, kinds: { id: string; title: string }[], fetchedAt: string): Collection` : tomes possédés seulement
  - `parseAmazonDimensions(html: string): Dimensions | null` : premier motif `a x b x c cm`, virgule ou point, trié (min = épaisseur, max = hauteur)
  - `isCaptchaPage(html: string): boolean`
  - `isbn13ToAsin(isbn: string): string | null`
  - `SAMPLE_SERIES: string[]` (titres de la spec)
- `node scripts/fetch-dimensions.ts [--sample]` : lit `data/collection.json`, saute les ASIN déjà dans `data/dimensions.json`, 3 s entre deux pages, écrit le cache après chaque tome, s'arrête sur captcha.

Tests :

- [ ] `parses dimensions with dots and commas`, `returns null without dimensions`, `detects a captcha page`
- [ ] `converts an ISBN-13 to an ISBN-10 ASIN` : `9782723489904` -> `2723489906`
- [ ] `keeps only owned volumes and resolves the audience`

### Task 7: Interface

**Files:**

- Create: `src/App.vue`, `src/components/BookcaseView.vue`, `src/components/PlanList.vue`, `src/components/SettingsPanel.vue`, `src/composables/useSettings.ts`, `src/colors.ts`, `src/style.css` (réécrit)

- [ ] Vue réaliste : 4 Billy côte à côte à l'échelle, marche et rangée arrière assombrie, tooltip `Série — t.N — l x é x h cm (estimé)`
- [ ] Résumé, plan texte par compartiment avec plages de tomes (`One Piece 1 à 40`), tomes non placés
- [ ] Bascule échantillon / collection complète, réglages persistés dans `localStorage` (try/catch)
- [ ] `vp check`, `vp test`, `vp build` passent ; vérification visuelle dans le navigateur
