import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import PlaygroundView from "./PlaygroundView.vue";

function mountPlayground() {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/guides/api", component: { template: "<div />" } }] });
  return mount(PlaygroundView, { global: { plugins: [router] } });
}

describe("PlaygroundView", () => {
  it("parses the example and exposes all result views", async () => {
    const wrapper = mountPlayground();
    await flushPromises();
    expect(wrapper.text()).toContain("Ready");
    expect(wrapper.text()).toContain("Example document");
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(4);
    await wrapper.find("#tab-result").trigger("click");
    expect(wrapper.find("#panel-result").text()).toContain('"readingTime"');
  });

  it("loads a different source example", async () => {
    const wrapper = mountPlayground();
    await wrapper.find("select").setValue("CommonMark");
    expect((wrapper.find("textarea").element as HTMLTextAreaElement).value).toContain("CommonMark example");
  });
});
