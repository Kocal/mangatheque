export interface Settings {
  innerWidth: number;
  innerDepth: number;
  innerHeight: number;
  shelfThickness: number;
  fixedShelfHeight: number;
  holePitch: number;
  riserHeight: number;
  headroom: number;
  rowSlack: number;
  bookcaseCount: number;
  maxShelves: number;
}

export type Zone = "upper" | "lower";

export function zoneHeights(settings: Settings): Record<Zone, number> {
  const room = Math.max(0, settings.innerHeight - settings.shelfThickness);
  const lower = Math.min(Math.max(0, settings.fixedShelfHeight), room);
  return { upper: room - lower, lower };
}

export const DEFAULT_SETTINGS: Settings = {
  innerWidth: 76,
  innerDepth: 26,
  innerHeight: 190,
  shelfThickness: 1.6,
  fixedShelfHeight: 74,
  holePitch: 3.2,
  riserHeight: 6,
  headroom: 1.5,
  rowSlack: 1,
  bookcaseCount: 4,
  maxShelves: 6,
};
