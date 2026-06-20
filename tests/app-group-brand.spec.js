const { test, expect } = require("@playwright/test");

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Two groups, each with its own wizard-assigned name/photo via per-conversation
// LOCAL_GC. (Note the raw titles differ, so we can tell the override is applied.)
const DATA = {
  __sample: true,
  conversations: [
    { id: "G1", type: "group", title: "raw alpha", participants: ["u1"], count: 1,
      msgs: [{ i: "m1", s: "u1", t: Date.parse("2020-01-01T10:00:00Z"), x: "hi from alpha" }], events: [] },
    { id: "G2", type: "group", title: "raw beta", participants: ["u2"], count: 1,
      msgs: [{ i: "m2", s: "u2", t: Date.parse("2020-01-02T10:00:00Z"), x: "hi from beta" }], events: [] },
  ],
};
const LOCAL_GC = { G1: { name: "Alpha GC", photo: PNG }, G2: { name: "Beta GC", photo: "" } };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("gca.onboarded", "1");
    localStorage.removeItem("gca.lastView");
  });
  await page.route("**/data.sample.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "window.CHAT_DATA = " + JSON.stringify(DATA) + ";" }));
  await page.route("**/data.js", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.route("**/local.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "window.LOCAL_GC = " + JSON.stringify(LOCAL_GC) + ";" }));
});

test("the sidebar brand name + photo follow the active group chat", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".bubble").first()).toBeVisible();

  await page.selectOption("#conv-select", "G1");
  await expect(page.locator("#brand-title")).toHaveText("Alpha GC");
  await expect(page.locator(".brand-mark")).toHaveCSS("background-image", /data:image/);

  await page.selectOption("#conv-select", "G2");
  await expect(page.locator("#brand-title")).toHaveText("Beta GC");
  // G2 has no photo: the group-1 photo is cleared (falls back to the CSS gradient).
  await expect(page.locator(".brand-mark")).not.toHaveCSS("background-image", /data:image/);
});
