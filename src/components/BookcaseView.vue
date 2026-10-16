<script setup lang="ts">
import { computed } from "vue";
import { backRowColor } from "../colors.ts";
import type { Row } from "../domain/compartment.ts";
import type { BookcaseLayout, Compartment } from "../domain/layout.ts";
import { zoneHeights } from "../domain/settings.ts";
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

const plinth = computed(() => Math.max(2, OUTER_HEIGHT - TOP - props.settings.innerHeight));
const outerWidth = computed(() => props.settings.innerWidth + 2 * SIDE);
const outerHeight = computed(() => TOP + props.settings.innerHeight + plinth.value);
const interiorBottom = computed(() => TOP + props.settings.innerHeight);

const y = (fromBottom: number) => interiorBottom.value - fromBottom;

const fixedShelf = computed(() => zoneHeights(props.settings).lower);

const movableShelves = computed(() =>
  (["upper", "lower"] as const).flatMap((zone) =>
    props.bookcase.compartments
      .filter((c) => c.zone === zone)
      .slice(1)
      .map((c) => c.bottom + c.height),
  ),
);

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
    :viewBox="`0 0 ${outerWidth} ${outerHeight}`"
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
    <rect
      v-for="(shelf, i) in movableShelves"
      :key="`shelf-${i}`"
      class="shelf"
      :x="SIDE"
      :y="y(shelf + settings.shelfThickness)"
      :width="settings.innerWidth"
      :height="settings.shelfThickness"
    />
    <rect
      class="shelf fixed"
      :x="SIDE"
      :y="y(fixedShelf + settings.shelfThickness)"
      :width="settings.innerWidth"
      :height="settings.shelfThickness"
    />
    <text class="fixed-label" :x="outerWidth - SIDE - 0.6" :y="y(fixedShelf) - 0.35">
      PLANCHE FIXE
    </text>
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
