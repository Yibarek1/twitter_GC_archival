const { test, expect } = require("@playwright/test");

// A message's "expanded" URL comes from the export and is attacker-influenceable.
// renderText must only turn http/https/mailto into live links — a javascript:
// (or other) scheme must render as inert text, never a clickable anchor.

// Inject a synthetic conversation by overriding the data scripts, so the test is
// deterministic regardless of any real personal_data/ on the machine.
const MALICIOUS = {
  __sample: true,
  conversations: [{
    id: "G1", type: "group", title: "Test Group", participants: ["u1"], count: 2,
    msgs: [
      {
        i: "m1", s: "u1", t: Date.parse("2020-05-01T10:00:00Z"),
        x: "click https://t.co/evil now",
        u: [{ s: "https://t.co/evil", e: "javascript:alert(document.domain)", d: "evil.example" }],
      },
      {
        i: "m2", s: "u1", t: Date.parse("2020-05-01T11:00:00Z"),
        x: "safe https://t.co/good",
        u: [{ s: "https://t.co/good", e: "https://good.example/page", d: "good.example" }],
      },
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
    route.fulfill({ contentType: "text/javascript", body: "window.CHAT_DATA = " + JSON.stringify(MALICIOUS) + ";" }));
  // Neutralize any real builds that would otherwise override the sample.
  await page.route("**/data.js", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.route("**/local.js", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
});

test("javascript: expanded URLs render inert; http(s) ones stay live", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".bubble").first()).toBeVisible();

  // The malicious expansion must NOT produce a clickable javascript: link...
  await expect(page.locator('.bubble a[href^="javascript:"]')).toHaveCount(0);
  // ...but its display text is still shown.
  await expect(page.locator(".bubble", { hasText: "evil.example" })).toBeVisible();

  // The legitimate https link remains a real anchor.
  await expect(page.locator('.bubble a[href="https://good.example/page"]')).toHaveCount(1);
});
