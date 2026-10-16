import type { Audience } from "./domain/types.ts";

export const AUDIENCE_HUES: Record<Audience, number> = {
  Shōnen: 24,
  Seinen: 214,
  Shōjo: 330,
  Josei: 152,
  Kodomo: 46,
};

const SHADES = [
  [72, 52],
  [60, 40],
  [80, 63],
  [55, 46],
  [68, 34],
  [76, 57],
];

export function seriesColor(group: Audience | null, colorIndex: number): string {
  const [saturation, lightness] = SHADES[colorIndex % SHADES.length];
  if (group === null) {
    return `hsl(0 0% ${lightness}%)`;
  }
  return `hsl(${AUDIENCE_HUES[group]} ${saturation}% ${lightness}%)`;
}
