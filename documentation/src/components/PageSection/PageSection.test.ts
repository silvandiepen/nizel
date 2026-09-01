import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import PageSection from "./PageSection.vue";
it("renders its title and content", () => { const wrapper = mount(PageSection, { props: { title: "Title" }, slots: { default: "Content" } }); expect(wrapper.text()).toContain("Title"); expect(wrapper.text()).toContain("Content"); });
