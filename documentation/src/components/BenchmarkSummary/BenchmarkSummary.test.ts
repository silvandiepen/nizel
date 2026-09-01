import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import BenchmarkSummary from "./BenchmarkSummary.vue";
it("shows benchmark context and measured engines", () => { const wrapper = mount(BenchmarkSummary); expect(wrapper.text()).toContain("1 September 2026"); expect(wrapper.text()).toContain("Nizel"); expect(wrapper.text()).toContain("markdown-it"); expect(wrapper.text()).toContain("Comark"); expect(wrapper.text()).toContain("41,315 Hz"); });
