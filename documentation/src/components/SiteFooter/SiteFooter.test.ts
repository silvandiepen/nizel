import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { expect, it } from "vitest";
import SiteFooter from "./SiteFooter.vue";
it("links to documentation, project, and legal resources", () => { const router = createRouter({ history: createMemoryHistory(), routes: [] }); const wrapper = mount(SiteFooter, { global: { plugins: [router] } }); expect(wrapper.text()).toContain("Getting started"); expect(wrapper.text()).toContain("API reference"); expect(wrapper.text()).toContain("GitHub"); expect(wrapper.text()).toContain("Support"); expect(wrapper.text()).toContain("Privacy"); expect(wrapper.text()).toContain("Terms"); });
