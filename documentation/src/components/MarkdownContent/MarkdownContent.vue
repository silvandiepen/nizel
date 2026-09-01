<template><div ref="root" :class="[bemm(), 'prose']" v-html="html" @click="handleClick" /></template>
<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useBemm } from "bemm";
import { renderMarkdown } from "../../composables/useMarkdown";
import type { MarkdownContentProps } from "./MarkdownContent.model";
import { getIcon } from "open-icon";
const bemm = useBemm("markdown-content", { includeBaseClass: true });
const props = defineProps<MarkdownContentProps>();
const html = ref("");
const root = ref<HTMLElement | null>(null);

async function enhanceCodeBlocks() {
  await nextTick();
  root.value?.querySelectorAll("table").forEach((table) => {
    if (table.parentElement?.classList.contains("prose__table-wrap")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "prose__table-wrap";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Scrollable data table");
    wrapper.tabIndex = 0;
    table.before(wrapper);
    wrapper.append(table);
  });
  root.value?.querySelectorAll("pre").forEach((block) => {
    if (block.querySelector("[data-copy-code]")) return;
    const languageClass = [...(block.querySelector("code")?.classList ?? [])].find((name) => name.startsWith("language-"));
    block.dataset.language ||= languageClass?.replace("language-", "").toUpperCase() || "CODE";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "prose__copy";
    button.dataset.copyCode = "";
    button.innerHTML = `${getIcon("clipboard") ?? ""}<span>Copy</span>`;
    button.setAttribute("aria-label", "Copy code block");
    block.append(button);
  });
}

async function handleClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-copy-code]");
  if (!button) return;
  const code = button.parentElement?.querySelector("code")?.textContent ?? "";
  await navigator.clipboard.writeText(code);
  const label = button.querySelector("span");
  if (label) label.textContent = "Copied";
  window.setTimeout(() => { if (label) label.textContent = "Copy"; }, 1500);
}

watch(() => props.source, async (source) => { html.value = (await renderMarkdown(source)).html; await enhanceCodeBlocks(); }, { immediate: true });
</script>
