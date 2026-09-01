<template><PageSection><MarkdownContent :source="source" /></PageSection></template>
<script setup lang="ts">
import { computed } from "vue";
import MarkdownContent from "@/components/MarkdownContent";
import PageSection from "@/components/PageSection";
import privacy from "../content/legal/privacy-policy.md?raw";
import terms from "../content/legal/terms.md?raw";
interface Props { document: "privacy" | "terms"; }
const props = defineProps<Props>();
const source = computed(() => props.document === "privacy" ? privacy : terms);
</script>
