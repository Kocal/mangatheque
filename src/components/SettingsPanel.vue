<script setup lang="ts">
import { isValidSetting } from "../composables/settings-storage.ts";
import type { Settings } from "../domain/settings.ts";

const settings = defineModel<Settings>({ required: true });
const emit = defineEmits<{ reset: [] }>();

const FIELDS: { key: keyof Settings; label: string; unit: string; step: number }[] = [
  { key: "innerWidth", label: "Largeur intérieure", unit: "cm", step: 0.1 },
  { key: "innerDepth", label: "Profondeur intérieure", unit: "cm", step: 0.1 },
  { key: "innerHeight", label: "Hauteur intérieure", unit: "cm", step: 0.1 },
  { key: "baseHeight", label: "Fond de la Billy, depuis le sol", unit: "cm", step: 0.1 },
  {
    key: "fixedShelfTop",
    label: "Dessus de la planche fixe, depuis le sol",
    unit: "cm",
    step: 0.1,
  },
  { key: "shelfThickness", label: "Épaisseur d'une planche", unit: "cm", step: 0.1 },
  { key: "holePitch", label: "Pas des trous de taquets", unit: "cm", step: 0.1 },
  { key: "riserHeight", label: "Hauteur de la marche", unit: "cm", step: 0.5 },
  { key: "headroom", label: "Marge au-dessus des tomes", unit: "cm", step: 0.5 },
  { key: "rowSlack", label: "Marge de largeur par rangée", unit: "cm", step: 0.5 },
  { key: "maxShelves", label: "Planches par Billy, fixe comprise", unit: "", step: 1 },
  { key: "bookcaseCount", label: "Nombre de Billy", unit: "", step: 1 },
];

function update(key: keyof Settings, event: Event) {
  const value = (event.target as HTMLInputElement).valueAsNumber;
  if (isValidSetting(value)) {
    settings.value = { ...settings.value, [key]: value };
  }
}
</script>

<template>
  <form class="settings" @submit.prevent>
    <p class="hint">Valeurs estimées : à vérifier avec un mètre.</p>
    <label v-for="field in FIELDS" :key="field.key" class="field">
      <span>{{ field.label }}</span>
      <span class="input">
        <input
          type="number"
          :step="field.step"
          min="0"
          :value="settings[field.key]"
          @change="update(field.key, $event)"
        />
        <span class="unit">{{ field.unit }}</span>
      </span>
    </label>
    <button type="button" class="reset" @click="emit('reset')">Valeurs par défaut</button>
  </form>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 10px;
}

.hint {
  margin: 0;
  font-size: 13px;
  color: var(--muted);
}

.field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.input {
  display: flex;
  align-items: center;
  gap: 4px;
}

input {
  width: 72px;
  padding: 4px 6px;
  font: inherit;
  text-align: right;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.unit {
  width: 18px;
  color: var(--muted);
}

.reset {
  justify-self: start;
  margin-top: 4px;
  padding: 6px 12px;
  font: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
</style>
