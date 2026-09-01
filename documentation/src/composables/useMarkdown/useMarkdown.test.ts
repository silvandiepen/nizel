import { expect, it } from "vitest";
import { renderMarkdown } from "./useMarkdown";
it("renders headings with prose classes", async () => { expect((await renderMarkdown("# Hello")).html).toContain('class="prose__heading"'); });
