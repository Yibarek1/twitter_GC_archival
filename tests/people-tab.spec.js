const { test, expect } = require("@playwright/test");

// Synthetic two-person group injected via the data scripts, so the People tab
// renders without any real personal_data/.
const DATA = {
  __sample: true,
  conversations: [{
    id: "G1", type: "group", title: "People Group", participants: ["u1", "u2"], count: 4,
    msgs: [
      { i: "m1", s: "u1", t: Date.parse("2020-05-01T10:00:00Z"), x: "hello there friend" },
      { i: "m2", s: "u2", t: Date.parse("2020-05-01T11:00:00Z"), x: "hey what is up" },
      { i: "m3", s: "u1", t: Date.parse("2020-05-02T10:00:00Z"), x: "not much you" },
      { i: "m4", s: "u2", t: Date.parse("2020-05-02T11:00:00Z"), x: "same old same old" },
    ],
    events: [],
  }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("gca.onboarded", "1");
    localStorage.removeItem("gca.lastView");
  });
  await page.route("**/data.sample.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "window.CHAT_DATA = " + JSON.stringify(DATA) + ";" }));
  await page.route("**/data.js", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.route("**/local.js", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
});

test("the People tab has no 'Simulate User' control", async ({ page }) => {
  await page.goto("/");
  await page.locator('.nav-item[data-view="people"]').click();
  await expect(page.locator(".person").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /simulate user/i })).toHaveCount(0);
});
