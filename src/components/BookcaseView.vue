<script setup lang="ts">
import { computed } from "vue";
import { backRowColor } from "../colors.ts";
import type { Row } from "../domain/compartment.ts";
import type { BookcaseLayout, Compartment } from "../domain/layout.ts";
import { shelfPositions } from "../domain/plan.ts";
import type { Settings } from "../domain/settings.ts";
import type { Book } from "../domain/types.ts";

const props = defineProps<{
  bookcase: BookcaseLayout;
  settings: Settings;
  colors: Map<string, string>;
  seriesIds: Map<string, number>;
}>();

const emit = defineEmits<{ hover: [book: Book | null] }>();

const SIDE = 1.8;
const TOP = 1.6;
const OUTER_HEIGHT = 202;
const BOOK_GAP = 0.06;
const ROW_OFFSET = 0.4;
const LABEL_MARGIN = 10;

const plinth = computed(() => Math.max(2, OUTER_HEIGHT - TOP - props.settings.innerHeight));
const outerWidth = computed(() => props.settings.innerWidth + 2 * SIDE);
const outerHeight = computed(() => TOP + props.settings.innerHeight + plinth.value);
const interiorBottom = computed(() => TOP + props.settings.innerHeight);

const y = (fromBottom: number) => interiorBottom.value - fromBottom;

const shelves = computed(() => shelfPositions(props.bookcase, props.settings));

const cm = (value: number) => value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

interface Spine {
  book: Book;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  series: number | undefined;
}

function spines(row: Row, floor: number, back: boolean): Spine[] {
  let x = SIDE + ROW_OFFSET;
  return row.books.map((book) => {
    const color = props.colors.get(book.id) ?? "grey";
    const spine = {
      book,
      x,
      y: y(floor + book.dims.height),
      width: Math.max(0.05, book.dims.thickness - BOOK_GAP),
      height: book.dims.height,
      fill: back ? backRowColor(color) : color,
      series: props.seriesIds.get(book.seriesTitle),
    };
    x += book.dims.thickness;
    return spine;
  });
}

const rows = computed(() =>
  props.bookcase.compartments.map((c: Compartment) => ({
    riser: c.back
      ? {
          x: SIDE,
          y: y(c.bottom + props.settings.riserHeight),
          width: props.settings.innerWidth,
          height: props.settings.riserHeight,
        }
      : null,
    layers: [
      c.back ? spines(c.back, c.bottom + props.settings.riserHeight, true) : [],
      spines(c.front, c.bottom, false),
    ],
  })),
);

const booksById = computed(
  () => new Map(rows.value.flatMap((r) => r.layers.flat().map((s) => [s.book.id, s.book]))),
);

function onOver(event: MouseEvent) {
  const id = (event.target as Element).closest("[data-book]")?.getAttribute("data-book");
  emit("hover", (id && booksById.value.get(id)) || null);
}

const hatchId = computed(() => `hatch-${props.bookcase.index}`);
</script>

<template>
  <svg
    class="bookcase"
    :viewBox="`0 0 ${outerWidth + LABEL_MARGIN} ${outerHeight}`"
    role="img"
    :aria-label="`Billy ${bookcase.index + 1}`"
    @mouseover="onOver"
    @mouseleave="emit('hover', null)"
  >
    <defs>
      <pattern :id="hatchId" patternUnits="userSpaceOnUse" width="1.2" height="1.2">
        <path d="M -0.3 0.3 L 0.3 -0.3 M 0 1.2 L 1.2 0 M 0.9 1.5 L 1.5 0.9" class="hatch" />
      </pattern>
    </defs>
    <rect class="frame" x="0" y="0" :width="outerWidth" :height="outerHeight" rx="0.4" />
    <rect
      class="inside"
      :x="SIDE"
      :y="TOP"
      :width="settings.innerWidth"
      :height="settings.innerHeight"
    />
    <g v-for="(shelf, i) in shelves" :key="`shelf-${i}`">
      <rect
        class="shelf"
        :class="{ fixed: shelf.fixed }"
        :x="SIDE"
        :y="y(shelf.position + settings.shelfThickness)"
        :width="settings.innerWidth"
        :height="settings.shelfThickness"
      />
      <text
        v-if="shelf.fixed"
        class="fixed-label"
        :x="outerWidth - SIDE - 0.6"
        :y="y(shelf.position) - 0.35"
      >
        PLANCHE FIXE
      </text>
      <line
        class="tick"
        :x1="outerWidth"
        :x2="outerWidth + 0.8"
        :y1="y(shelf.position + settings.shelfThickness / 2)"
        :y2="y(shelf.position + settings.shelfThickness / 2)"
      />
      <text
        class="height-label"
        :class="{ fixed: shelf.fixed }"
        :x="outerWidth + 1.2"
        :y="y(shelf.position + settings.shelfThickness / 2) + 0.9"
      >
        {{ cm(shelf.position) }}
      </text>
    </g>
    <g v-for="(row, i) in rows" :key="`compartment-${i}`">
      <rect v-if="row.riser" class="riser" v-bind="row.riser" />
      <g v-for="(layer, l) in row.layers" :key="l">
        <g
          v-for="spine in layer"
          :key="spine.book.id"
          class="spine"
          :data-book="spine.book.id"
          :data-s="spine.series"
        >
          <rect
            :x="spine.x"
            :y="spine.y"
            :width="spine.width"
            :height="spine.height"
            :fill="spine.fill"
          />
          <rect
            v-if="spine.book.estimated"
            :x="spine.x"
            :y="spine.y"
            :width="spine.width"
            :height="spine.height"
            :fill="`url(#${hatchId})`"
          />
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.bookcase {
  display: block;
  width: 100%;
  height: auto;
}

.frame {
  fill: var(--billy);
}

.inside {
  fill: var(--billy-inside);
}

.shelf {
  fill: var(--billy-shelf);
}

.shelf.fixed {
  fill: var(--billy-fixed);
}

.fixed-label {
  font-size: 1.5px;
  font-weight: 700;
  letter-spacing: 0.1px;
  text-anchor: end;
  fill: var(--billy-fixed-label);
}

.tick {
  stroke: var(--muted);
  stroke-width: 0.2;
}

.height-label {
  font-size: 2.4px;
  fill: var(--text);
  font-variant-numeric: tabular-nums;
}

.height-label.fixed {
  fill: var(--accent);
  font-weight: 700;
}

.riser {
  fill: var(--riser);
}

.spine {
  cursor: pointer;
}

.hatch {
  stroke: rgb(255 255 255 / 0.55);
  stroke-width: 0.25;
}
</style>
