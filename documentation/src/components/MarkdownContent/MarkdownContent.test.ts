import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import MarkdownContent from "./MarkdownContent.vue";
it("renders Markdown content", async () => { const wrapper = mount(MarkdownContent, { props: { source: "# Hello" } }); await new Promise((resolve) => setTimeout(resolve)); expect(wrapper.text()).toContain("Hello"); });
