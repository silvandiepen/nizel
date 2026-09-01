<template><span :class="bemm()" aria-hidden="true" v-html="svg" /></template>

<script setup lang="ts">
import { computed } from "vue";
import { useBemm } from "bemm";
import { getIcon } from "open-icon";

const props = defineProps<{ name: string }>();
const bemm = useBemm("open-icon", { includeBaseClass: true });
const svg = computed(() => getIcon(props.name) ?? "");
</script>

<style lang="scss">
.open-icon { display: inline-flex; width: 1em; height: 1em; flex: none; align-items: center; justify-content: center; }
.open-icon :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
