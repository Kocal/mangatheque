<script setup lang="ts">
import type { Row } from "../domain/compartment.ts";
import type { BookcaseLayout } from "../domain/layout.ts";
import { bookGroups, shelfPositions } from "../domain/plan.ts";
import type { Settings } from "../domain/settings.ts";

defineProps<{ bookcases: BookcaseLayout[]; settings: Settings }>();
const emit = defineEmits<{ hover: [seriesTitle: string | null] }>();

const cm = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

const rowsOf = (front: Row, back: Row | null) =>
  back
    ? [
        { label: "Devant", groups: bookGroups(front.books) },
        { label: "Derrière", groups: bookGroups(back.books) },
      ]
    : [{ label: "Rangée", groups: bookGroups(front.books) }];
</script>

<template>
  <div class="plan">
    <section v-for="bookcase in bookcases" :key="bookcase.index" class="card">
      <h3>Billy {{ bookcase.index + 1 }}</h3>
      <p class="shelves">
        Dessus des planches, depuis le sol :
        <span
          v-for="(shelf, i) in shelfPositions(bookcase, settings)"
          :key="i"
          :class="{ fixed: shelf.fixed }"
        >
          {{ cm(shelf.top) }} cm<template v-if="shelf.fixed"> (fixe)</template>
        </span>
      </p>
      <p v-if="bookcase.compartments.length === 0" class="empty">Vide</p>
      <ol v-else>
        <li v-for="(c, i) in bookcase.compartments" :key="i">
          <p class="meta">
            <strong>Compartiment {{ i + 1 }}</strong>
            <span>{{ cm(c.height) }} cm</span>
            <span v-if="c.back" class="badge">double rangée</span>
          </p>
          <div v-for="row in rowsOf(c.front, c.back)" :key="row.label" class="row">
            <span class="label">{{ row.label }}</span>
            <ul class="groups">
              <li
                v-for="group in row.groups"
                :key="group.text"
                class="group"
                @mouseenter="emit('hover', group.seriesTitle)"
                @mouseleave="emit('hover', null)"
              >
                <img
                  v-if="group.cover"
                  :src="group.cover"
                  alt=""
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
                <span v-else class="no-cover"></span>
                <span class="text">{{ group.text }}</span>
              </li>
            </ul>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.plan {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
}

h3 {
  margin: 0 0 8px;
  font-size: 15px;
}

.shelves {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.shelves span {
  color: var(--text);
}

.shelves .fixed {
  color: var(--accent);
  font-weight: 600;
}

ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 14px;
}

p {
  margin: 0;
}

.meta {
  display: flex;
  gap: 8px;
  align-items: baseline;
  font-size: 13px;
  color: var(--muted);
}

.meta strong {
  color: var(--text);
}

.badge {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
}

.row {
  display: grid;
  grid-template-columns: 64px 1fr;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
}

.label {
  color: var(--muted);
  padding-top: 2px;
}

.groups {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 6px;
  line-height: 1.3;
}

.group:hover {
  background: var(--surface-2);
}

.group img,
.no-cover {
  flex: none;
  width: 30px;
  height: 44px;
  object-fit: cover;
  border-radius: 3px;
  background: var(--surface-2);
}

.empty {
  color: var(--muted);
  font-size: 13px;
}
</style>
