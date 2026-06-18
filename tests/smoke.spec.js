const { test, expect } = require("@playwright/test");

function pickSearchTerm(text) {
  return (text || "")
    .toLowerCase()
    .match(/[a-z0-9']{4,}/g)
    ?.find((word) => !["https", "http", "this", "that"].includes(word)) || "message";
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("gca.onboarded", "1");
    localStorage.removeItem("gca.lastView");
  });
});

test("app boots and shows archive data", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#s-input")).toBeVisible();
  await expect(page.locator("#s-meta")).toContainText(/Showing all|messages found/);
  await expect(page.locator(".msg").first()).toBeVisible();
});

test("search filters visible messages", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".bubble").first()).toBeVisible();

  const firstBubble = await page.locator(".bubble").first().innerText();
  const term = pickSearchTerm(firstBubble);

  await page.locator("#s-input").fill(term);
  await expect(page.locator("#s-meta")).toContainText(/message(s)? found/);
  await expect(page.locator(".bubble").first()).toContainText(new RegExp(term, "i"));
});

test("timeline renders and jumps by date", async ({ page }) => {
  await page.goto("/");

  await page.locator('[data-view="timeline"]').click();
  await expect(page.locator("#tl-scroll")).toBeVisible();

  const dateInput = page.locator('#tl-scrubber input[type="date"]');
  await expect(dateInput).toBeVisible();
  await dateInput.evaluate((input) => {
    input.value = input.min;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });

  await expect(page.locator("#tl-list .msg").first()).toBeVisible();
});

test("setup page renders source step", async ({ page }) => {
  await page.goto("/setup.html");

  await expect(page.locator("#btn-build")).toBeVisible();
  await expect(page.locator("#src-group")).toBeVisible();
  await expect(page.locator("#src-headers")).toBeVisible();
  await expect(page.locator("#src-media")).toBeVisible();
});

test("server rejects bad paths and malformed api bodies", async ({ request }) => {
  const traversal = await request.get("/%2e%2e%2fREADME.md");
  expect(traversal.status()).toBe(403);

  const badJson = await request.post("/api/source", {
    data: "not json",
    headers: { "content-type": "application/json" },
  });
  expect(badJson.status()).toBe(400);

  const missingSource = await request.post("/api/source", { data: {} });
  expect(missingSource.status()).toBe(400);
});
