const { test, expect } = require("@playwright/test");

// Profile photos must persist under their own localStorage key (gca.pfps), never
// inside the gca.settings blob — otherwise one over-quota photo silently wipes
// names/pins/saved searches. These tests pin that contract via the real UI.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("gca.onboarded", "1");
    localStorage.removeItem("gca.lastView");
  });
});

async function openPeople(page) {
  await page.locator('[data-view="people"]').click();
  await expect(page.locator(".person").first()).toBeVisible();
}

test("a profile photo is stored under its own key, not the settings blob", async ({ page }) => {
  await page.goto("/");
  await openPeople(page);

  // Name the first person (writes gca.settings) and give them a small photo.
  await page.locator(".person-name-input").first().fill("Tester");
  await page.locator(".pfp-file").first().setInputFiles({
    name: "tiny.png", mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });

  // The photo lands in gca.pfps...
  await expect
    .poll(() => page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("gca.pfps") || "{}")).length))
    .toBeGreaterThan(0);

  // ...and the settings blob holds no image data at all.
  const settingsStr = await page.evaluate(() => localStorage.getItem("gca.settings") || "");
  expect(settingsStr).not.toContain("data:image");
  expect(JSON.parse(settingsStr).pfps).toBeUndefined();

  // Both survive a reload.
  await page.reload();
  await openPeople(page);
  await expect(page.locator(".person-name-input").first()).toHaveValue("Tester");
});

test("an over-quota photo warns and never wipes other settings", async ({ page }) => {
  await page.goto("/");
  await openPeople(page);

  await page.locator(".person-name-input").first().fill("Keeper");

  // A photo far larger than the localStorage quota.
  const big = Buffer.alloc(12 * 1024 * 1024, 120);
  await page.locator(".pfp-file").first().setInputFiles({ name: "big.png", mimeType: "image/png", buffer: big });

  // The user is told why it didn't save...
  await expect(page.locator(".toast")).toContainText(/too large/i);

  // ...the name in gca.settings is untouched, and the giant blob never landed.
  const names = await page.evaluate(() => JSON.parse(localStorage.getItem("gca.settings") || "{}").names || {});
  expect(Object.values(names)).toContain("Keeper");
  const pfps = await page.evaluate(() => localStorage.getItem("gca.pfps") || "");
  expect(pfps).not.toContain("data:image");

  // The name persists across reload (settings were never corrupted).
  await page.reload();
  await openPeople(page);
  await expect(page.locator(".person-name-input").first()).toHaveValue("Keeper");
});
