import { ref } from "vue";
import { FROZEN } from "../data/library.ts";
import { freezeBookcase } from "../domain/layout.ts";
import type { BookcaseLayout, FrozenBookcase } from "../domain/layout.ts";

export function useFrozen() {
  const frozen = ref<FrozenBookcase[]>(FROZEN);
  const error = ref<string | null>(null);

  async function save(next: FrozenBookcase[]): Promise<void> {
    try {
      const response = await fetch("/__frozen", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      frozen.value = next;
      error.value = null;
    } catch {
      error.value = "Impossible d'enregistrer : l'appli doit tourner avec vp dev.";
    }
  }

  function freeze(bookcase: BookcaseLayout): Promise<void> {
    const others = frozen.value.filter((f) => f.index !== bookcase.index);
    return save([...others, freezeBookcase(bookcase)].sort((a, b) => a.index - b.index));
  }

  function unfreeze(index: number): Promise<void> {
    return save(frozen.value.filter((f) => f.index !== index));
  }

  return { frozen, freeze, unfreeze, error };
}
