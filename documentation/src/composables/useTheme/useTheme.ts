import { computed, ref } from "vue";

export type ThemeMode = "system" | "light" | "dark";
const storageKey = "nizel-docs-theme";
const mode = ref<ThemeMode>("system");

function apply(value: ThemeMode) {
  mode.value = value;
  if (value === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = value;
  localStorage.setItem(storageKey, value);
}

/** Provides the persistent documentation colour-mode preference. */
export function useTheme() {
  const stored = localStorage.getItem(storageKey);
  if (stored === "light" || stored === "dark" || stored === "system") apply(stored);
  const nextLabel = computed(() => mode.value === "system" ? "Use light theme" : mode.value === "light" ? "Use dark theme" : "Use system theme");
  function cycle() { apply(mode.value === "system" ? "light" : mode.value === "light" ? "dark" : "system"); }
  return { mode, nextLabel, cycle };
}
