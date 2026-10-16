<script setup lang="ts">
import { computed, ref } from "vue";
import { seriesColor } from "./colors.ts";
import BookcaseView from "./components/BookcaseView.vue";
import PlanList from "./components/PlanList.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { useHighlightStyle } from "./composables/useHighlightStyle.ts";
import { useSettings } from "./composables/useSettings.ts";
import { COLLECTION, DIMENSIONS, SAMPLE, volumeCount } from "./data/library.ts";
import { UNIVERSES } from "./data/universes.ts";
import { computeLayout } from "./domain/layout.ts";
import { buildUnits } from "./domain/ordering.ts";
import { describeBooks, shelvesUsed } from "./domain/plan.ts";
import { AUDIENCES } from "./domain/types.ts";
import type { Audience, Book } from "./domain/types.ts";

const { settings, reset } = useSettings();
const dataset = ref<"sample" | "full">(
  new URLSearchParams(location.search).get("collection") === "echantillon" ? "sample" : "full",
);
const showSettings = ref(false);
const hovered = ref<Book | null>(null);
const planHover = ref<string | null>(null);
const focus = ref<number | null>(null);
const highlighted = computed(() => hovered.value?.seriesTitle ?? planHover.value);
const seriesIds = computed(() => {
  const ids = new Map<string, number>();
  units.value.forEach((u) => ids.has(u.seriesTitle) || ids.set(u.seriesTitle, ids.size));
  return ids;
});
useHighlightStyle(
  computed(() => (highlighted.value === null ? undefined : seriesIds.value.get(highlighted.value))),
);
const planBookcases = computed(() =>
  layout.value.bookcases.filter((b) => focus.value === null || b.index === focus.value),
);

const collection = computed(() => (dataset.value === "sample" ? SAMPLE : COLLECTION));
const units = computed(() => buildUnits(collection.value, DIMENSIONS, UNIVERSES));
const layout = computed(() => computeLayout(units.value, settings.value));

const colors = computed(
  () =>
    new Map(
      units.value.flatMap((u) =>
        u.books.map((b) => [b.id, seriesColor(u.group, u.colorIndex)] as const),
      ),
    ),
);

const legend = computed(() => {
  const groups = new Set(units.value.map((u) => u.group));
  return [...AUDIENCES, null]
    .filter((g): g is Audience | null => groups.has(g))
    .map((g) => ({ label: g ?? "Sans public", color: seriesColor(g, 0) }));
});

const stats = computed(() => {
  const books = units.value.flatMap((u) => u.books);
  const shelves = layout.value.bookcases.reduce((sum, b) => sum + shelvesUsed(b), 0);
  return [
    { label: "Tomes placés", value: `${layout.value.placedCount} / ${books.length}` },
    { label: "Compartiments en double rangée", value: `${layout.value.doubleCount}` },
    {
      label: "Planches utilisées",
      value: `${shelves} / ${layout.value.bookcases.length * settings.value.maxShelves}`,
    },
    { label: "Dimensions estimées", value: `${books.filter((b) => b.estimated).length}` },
  ];
});

const cm = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const hoverText = computed(() => {
  const book = hovered.value;
  if (!book) {
    return "Survole un tome pour voir son nom.";
  }
  const edition = book.editionTitle ? ` (${book.editionTitle})` : "";
  const { width, thickness, height } = book.dims;
  const estimated = book.estimated ? ", estimé" : "";
  const number = book.number === 0 ? "" : ` · t. ${book.number}`;
  return `${book.seriesTitle}${edition}${number} · ${cm(width)} × ${cm(thickness)} × ${cm(height)} cm${estimated}`;
});
</script>

<template>
  <div class="page">
    <header class="top">
      <div>
        <h1>Mangathèque</h1>
        <p class="subtitle">
          Plan de rangement par public visé, sur {{ settings.bookcaseCount }} Billy
        </p>
      </div>
      <div class="controls">
        <div class="segmented" role="group" aria-label="Données">
          <button type="button" :class="{ on: dataset === 'sample' }" @click="dataset = 'sample'">
            Échantillon · {{ volumeCount(SAMPLE) }}
          </button>
          <button type="button" :class="{ on: dataset === 'full' }" @click="dataset = 'full'">
            Collection complète · {{ volumeCount(COLLECTION) }}
          </button>
        </div>
        <button
          type="button"
          class="ghost"
          :aria-expanded="showSettings"
          @click="showSettings = !showSettings"
        >
          Réglages
        </button>
      </div>
    </header>

    <section class="stats">
      <div v-for="stat in stats" :key="stat.label" class="stat">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </section>

    <div class="toolbar">
      <ul class="legend">
        <li v-for="item in legend" :key="item.label">
          <span class="swatch" :style="{ background: item.color }"></span>{{ item.label }}
        </li>
        <li><span class="swatch back"></span>Rangée arrière</li>
      </ul>
      <p class="hover" aria-live="polite">
        <span class="hover-cover">
          <img v-if="hovered?.cover" :src="hovered.cover" alt="" referrerpolicy="no-referrer" />
        </span>
        <span class="hover-text">{{ hoverText }}</span>
      </p>
    </div>

    <section class="stage">
      <figure
        v-for="bookcase in layout.bookcases"
        :key="bookcase.index"
        :class="{ muted: focus !== null && focus !== bookcase.index }"
        @click="focus = focus === bookcase.index ? null : bookcase.index"
      >
        <BookcaseView
          :bookcase="bookcase"
          :settings="settings"
          :colors="colors"
          :series-ids="seriesIds"
          @hover="hovered = $event"
        />
        <figcaption>
          Billy {{ bookcase.index + 1 }} · {{ shelvesUsed(bookcase) }} planche{{
            shelvesUsed(bookcase) > 1 ? "s" : ""
          }}
          · hauteurs en cm
        </figcaption>
      </figure>
    </section>

    <section v-if="layout.overflow.length > 0" class="overflow">
      <h2>Ne rentre pas ({{ layout.overflow.length }} tomes)</h2>
      <p>{{ describeBooks(layout.overflow).join(" · ") }}</p>
    </section>

    <div class="plan-head">
      <h2>Plan à suivre</h2>
      <div class="segmented" role="group" aria-label="Billy affichée">
        <button type="button" :class="{ on: focus === null }" @click="focus = null">Toutes</button>
        <button
          v-for="bookcase in layout.bookcases"
          :key="bookcase.index"
          type="button"
          :class="{ on: focus === bookcase.index }"
          @click="focus = bookcase.index"
        >
          Billy {{ bookcase.index + 1 }}
        </button>
      </div>
    </div>
    <PlanList :bookcases="planBookcases" :settings="settings" @hover="planHover = $event" />

    <aside v-if="showSettings" class="drawer" aria-label="Réglages">
      <div class="drawer-head">
        <h2>Réglages</h2>
        <button type="button" class="ghost" @click="showSettings = false">Fermer</button>
      </div>
      <SettingsPanel v-model="settings" @reset="reset" />
    </aside>
  </div>
</template>

<style scoped>
.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
}

h1 {
  margin: 0;
  font-size: 28px;
  letter-spacing: -0.02em;
}

h2 {
  margin: 32px 0 12px;
  font-size: 18px;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--muted);
}

.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.segmented {
  display: inline-flex;
  padding: 3px;
  background: var(--surface-2);
  border-radius: 9px;
}

.segmented button,
.ghost {
  padding: 6px 12px;
  font: inherit;
  font-size: 14px;
  color: var(--text);
  background: transparent;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.segmented button.on {
  background: var(--surface);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.12);
}

.ghost {
  border: 1px solid var(--border);
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.stat {
  display: grid;
  gap: 2px;
  padding: 12px 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 13px;
  color: var(--muted);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 24px;
  margin: 20px 0 12px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 2px;
}

.swatch.back {
  background: var(--muted);
  filter: brightness(0.62);
}

.hover {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  height: 50px;
  min-width: 0;
  max-width: 100%;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.stage {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
}

figure {
  flex: 1 0 200px;
  margin: 0;
  cursor: pointer;
  transition: opacity 150ms;
}

figcaption {
  margin-top: 6px;
  text-align: center;
  font-size: 13px;
  color: var(--muted);
}

figure.muted {
  opacity: 0.35;
}

.hover-cover {
  flex: none;
  width: 34px;
  height: 50px;
  border-radius: 3px;
  background: var(--surface-2);
  overflow: hidden;
}

.hover-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hover-text {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.plan-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
  margin: 32px 0 12px;
}

.plan-head h2 {
  margin: 0;
}

.overflow {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid var(--warn-border);
  background: var(--warn-bg);
  border-radius: 10px;
}

.overflow h2 {
  margin: 0 0 6px;
  font-size: 15px;
}

.overflow p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(380px, 100vw);
  overflow-y: auto;
  padding: 16px 20px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: -8px 0 24px rgb(0 0 0 / 0.12);
}

.drawer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-head h2 {
  margin: 0;
}
</style>
