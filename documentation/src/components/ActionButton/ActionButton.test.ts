import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ActionButton from "./ActionButton.vue";
describe("ActionButton", () => { it("renders an external link", () => { expect(mount(ActionButton, { props: { href: "https://example.com" }, slots: { default: "Open" } }).get("a").attributes("href")).toBe("https://example.com"); }); });
