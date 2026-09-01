import { createHighlightedProcessor } from "../../lib/highlighting";
import type { MarkdownDocument } from "./useMarkdown.model";

const elements = { h1: { class: "prose__heading" }, h2: { class: "prose__heading" }, h3: { class: "prose__subheading" }, h4: { class: "prose__subheading" }, p: { class: "prose__paragraph" }, ul: { class: "prose__list" }, ol: { class: "prose__list" }, li: { class: "prose__item" }, a: { class: "prose__link" }, code: { class: "prose__code" }, pre: { class: "prose__pre" }, blockquote: { class: "prose__quote" }, table: { class: "prose__table" }, thead: { class: "prose__table-head" }, tbody: { class: "prose__table-body" }, tr: { class: "prose__table-row" }, th: { class: "prose__table-heading" }, td: { class: "prose__table-cell" } } as const;

/** Renders documentation Markdown with stable BEM classes. */
export async function renderMarkdown(source: string): Promise<MarkdownDocument> {
  const processor = await createHighlightedProcessor({ elements });
  const result = await processor(source);
  return { html: result.html, meta: result.meta };
}
