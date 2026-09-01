<template><PageSection eyebrow="Support" title="Get help with Nizel." lede="For usage questions, bugs, and feature requests, open an issue with a small reproducible example."><div :class="bemm('actions')"><ActionButton href="https://github.com/silvandiepen/nizel/issues" variant="primary" icon="code">Open a GitHub issue</ActionButton><ActionButton href="mailto:support@hakobs.com" icon="mail">Email support</ActionButton></div></PageSection></template>
<script setup lang="ts">
import { useBemm } from "bemm";
import ActionButton from "@/components/ActionButton";
import PageSection from "@/components/PageSection";
const bemm = useBemm("support-view", { includeBaseClass: true });
</script>
<style lang="scss">.support-view { &__actions { display: flex; flex-wrap: wrap; gap: var(--space-s); } }</style>
