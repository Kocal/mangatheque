import { onMounted, onUnmounted, watchEffect } from "vue";
import type { Ref } from "vue";

export function useHighlightStyle(seriesId: Ref<number | undefined>): void {
  const style = document.createElement("style");
  onMounted(() => document.head.appendChild(style));
  onUnmounted(() => style.remove());
  watchEffect(() => {
    style.textContent =
      seriesId.value === undefined
        ? ""
        : `.bookcase .spine:not([data-s="${seriesId.value}"]) { opacity: 0.22; }`;
  });
}
