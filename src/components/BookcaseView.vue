<script setup lang="ts">
import { computed } from "vue";
import type { Row } from "../domain/compartment.ts";
import type { BookcaseLayout, Compartment } from "../domain/layout.ts";
import { zoneHeights } from "../domain/settings.ts";
import type { Settings } from "../domain/settings.ts";
import type { Book } from "../domain/types.ts";

const props = defineProps<{
  bookcase: BookcaseLayout;
  settings: Settings;
  colors: Map<string, string>;
  highlighted: string | null;
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

const shelves = computed(() => {
  const list = [zoneHeights(props.settings).lower];
  for (const zone of ["upper", "lower"] as const) {
    const inZone = props.bookcase.compartments.filter((c) => c.zone === zone);
    inZone.slice(1).forEach((c) => list.push(c.bottom + c.height));
  }
  return list;
});

interface Spine {
  book: Book;
  x: number;
  y: number;
  width: number;
  height: number;
}

function spines(row: Row, floor: number): Spine[] {
  let x = SIDE + ROW_OFFSET;
  return row.books.map((book) => {
    const spine = {
      book,
      x,
      y: y(floor + book.dims.height),
      width: Math.max(0.05, book.dims.thickness - BOOK_GAP),
      height: book.dims.height,
    };
    x += book.dims.thickness;
    return spine;
  });
}

const rows = computed(() =>
  props.bookcase.compartments.map((c: Compartment) => ({
    compartment: c,
    riser: c.back
      ? {
          x: SIDE,
          y: y(c.bottom + props.settings.riserHeight),
          width: props.settings.innerWidth,
          height: props.settings.riserHeight,
        }
      : null,
    back: c.back ? spines(c.back, c.bottom + props.settings.riserHeight) : [],
    front: spines(c.front, c.bottom),
  })),
);

const dimmed = (book: Book) => props.highlighted !== null && book.seriesTitle !== props.highlighted;

const hatchId = computed(() => `hatch-${props.bookcase.index}`);
</script>

<template>
  <svg
    class="bookcase"
    :viewBox="`0 0 ${outerWidth} ${outerHeight}`"
    role="img"
    :aria-label="`Billy ${bookcase.index + 1}`"
    @mouseleave="emit('hover', null)"
  >
    <rect class="frame" x="0" y="0" :width="outerWidth" :height="outerHeight" rx="0.4" />
    <rect
      class="inside"
      :x="SIDE"
      :y="TOP"
      :width="settings.innerWidth"
      :height="settings.innerHeight"
    />
    <rect
      v-for="(shelf, i) in shelves"
      :key="`shelf-${i}`"
      class="shelf"
      :class="{ fixed: i === 0 }"
      :x="SIDE"
      :y="y(shelf + settings.shelfThickness)"
      :width="settings.innerWidth"
      :height="settings.shelfThickness"
    />
    <defs>
      <pattern :id="hatchId" patternUnits="userSpaceOnUse" width="1.2" height="1.2">
        <path d="M -0.3 0.3 L 0.3 -0.3 M 0 1.2 L 1.2 0 M 0.9 1.5 L 1.5 0.9" class="hatch" />
      </pattern>
    </defs>
    <g v-for="(row, i) in rows" :key="`compartment-${i}`">
      <rect v-if="row.riser" class="riser" v-bind="row.riser" />
      <g
        v-for="layer in [
          { name: 'back', spines: row.back },
          { name: 'front', spines: row.front },
        ]"
        :key="layer.name"
        :class="layer.name"
      >
        <g
          v-for="spine in layer.spines"
          :key="spine.book.id"
          class="spine"
          :class="{ dimmed: dimmed(spine.book) }"
          @mouseenter="emit('hover', spine.book)"
        >
          <rect
            :x="spine.x"
            :y="spine.y"
            :width="spine.width"
            :height="spine.height"
            :fill="colors.get(spine.book.id)"
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

.riser {
  fill: var(--riser);
}

.back {
  filter: brightness(0.62) saturate(0.85);
}

.spine {
  transition: opacity 120ms;
  cursor: pointer;
}

.hatch {
  stroke: rgb(255 255 255 / 0.55);
  stroke-width: 0.25;
}

.spine.dimmed {
  opacity: 0.22;
}
</style>
