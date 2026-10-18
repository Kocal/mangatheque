import { ref, watch } from "vue";
import { DEFAULT_SETTINGS } from "../domain/settings.ts";
import type { Settings } from "../domain/settings.ts";
import { parseSettings } from "./settings-storage.ts";

const STORAGE_KEY = "mangatheque:settings";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function store(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export function useSettings() {
  const settings = ref<Settings>(parseSettings(readStored()));
  watch(settings, store, { deep: true });

  function reset(): void {
    settings.value = { ...DEFAULT_SETTINGS };
  }

  return { settings, reset };
}
