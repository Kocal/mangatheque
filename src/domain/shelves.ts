import type { BookcaseLayout, Compartment } from "./layout.ts";
import { zoneHeights } from "./settings.ts";
import type { Settings, Zone } from "./settings.ts";

const EPSILON = 1e-9;

function stepsFor(need: number, settings: Settings): number {
  return Math.ceil((need + settings.shelfThickness) / settings.holePitch - EPSILON);
}

function spread(steps: number[], capacity: number): number[] {
  const result = [...steps];
  for (let free = capacity - steps.reduce((a, b) => a + b, 0); free > 0; free--) {
    result[result.indexOf(Math.min(...result))]++;
  }
  return result;
}

function place(
  compartments: Compartment[],
  steps: number[],
  zoneHeight: number,
  floor: number,
  settings: Settings,
) {
  const { holePitch, shelfThickness } = settings;
  const used = steps.reduce((a, b) => a + b, 0) * holePitch - shelfThickness;
  const leftover = Math.max(0, zoneHeight - used);

  let bottom = floor;
  for (let rank = compartments.length - 1; rank >= 0; rank--) {
    const height = steps[rank] * holePitch - shelfThickness + (rank === 0 ? leftover : 0);
    compartments[rank].height = height;
    compartments[rank].bottom = bottom;
    bottom += height + shelfThickness;
  }
}

export function assignShelfHeights(bookcases: BookcaseLayout[], settings: Settings): void {
  const heights = zoneHeights(settings);
  const floors: Record<Zone, number> = {
    upper: heights.lower + settings.shelfThickness,
    lower: 0,
  };

  for (const zone of ["upper", "lower"] as const) {
    const capacity = Math.floor(
      (heights[zone] + settings.shelfThickness) / settings.holePitch + EPSILON,
    );
    const groups = new Map<number, Compartment[][]>();
    for (const bookcase of bookcases) {
      const inZone = bookcase.compartments.filter((c) => c.zone === zone);
      if (inZone.length > 0) {
        groups.set(inZone.length, [...(groups.get(inZone.length) ?? []), inZone]);
      }
    }

    for (const [count, members] of groups) {
      const own = members.map((compartments) =>
        compartments.map((c) => stepsFor(c.neededHeight, settings)),
      );
      const aligned = Array.from({ length: count }, (_, rank) =>
        Math.max(...own.map((steps) => steps[rank])),
      );
      const fitsAligned = aligned.reduce((a, b) => a + b, 0) <= capacity;

      members.forEach((compartments, i) => {
        const steps = spread(fitsAligned ? aligned : own[i], capacity);
        place(compartments, steps, heights[zone], floors[zone], settings);
      });
    }
  }
}
