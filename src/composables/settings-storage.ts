import { DEFAULT_SETTINGS } from "../domain/settings.ts";
import type { Settings } from "../domain/settings.ts";

export function parseSettings(raw: string | null): Settings {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object") {
      stored = parsed as Record<string, unknown>;
    }
  } catch {
    return { ...DEFAULT_SETTINGS };
  }

  const settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const value = stored[key];
    if (isValidSetting(value)) {
      settings[key] = value;
    }
  }
  return settings;
}

export function isValidSetting(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
