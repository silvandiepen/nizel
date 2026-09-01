import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { expect, it } from "vitest";
import SiteHeader from "./SiteHeader.vue";
it("shows the primary destinations", async () => { const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { template: "<div />" } }] }); const wrapper = mount(SiteHeader, { global: { plugins: [router] } }); expect(wrapper.text()).toContain("Docs"); expect(wrapper.text()).toContain("Playground"); });
