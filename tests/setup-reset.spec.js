const { test, expect } = require("@playwright/test");

test("reset requires a typed RESET and then calls /api/reset", async ({ page }) => {
  let resetCalled = false;
  await page.route("**/api/reset", (route) => {
    resetCalled = true;
    route.fulfill({ status: 200, contentType: "application/json",
      body: JSON.stringify({ ok: true, removed: ["config.json", "data.js"] }) });
  });

  await page.goto("/setup.html");

  // Modal is closed until the danger link is clicked.
  await expect(page.locator("#reset-modal")).toBeHidden();
  await page.locator("#btn-reset").click();
  await expect(page.locator("#reset-modal")).toBeVisible();

  // Confirm stays disabled until the exact word RESET is typed.
  await expect(page.locator("#reset-go")).toBeDisabled();
  await page.locator("#reset-confirm").fill("reset");          // wrong case
  await expect(page.locator("#reset-go")).toBeDisabled();
  await page.locator("#reset-confirm").fill("RESET");
  await expect(page.locator("#reset-go")).toBeEnabled();

  await page.locator("#reset-go").click();
  await expect.poll(() => resetCalled).toBe(true);
  await expect(page.locator("#reset-result")).toContainText(/Erased/i);
});

test("cancel closes the reset modal without calling the server", async ({ page }) => {
  let resetCalled = false;
  await page.route("**/api/reset", (route) => { resetCalled = true; route.fulfill({ status: 200, body: "{}" }); });

  await page.goto("/setup.html");
  await page.locator("#btn-reset").click();
  await expect(page.locator("#reset-modal")).toBeVisible();
  await page.locator("#reset-cancel").click();
  await expect(page.locator("#reset-modal")).toBeHidden();
  expect(resetCalled).toBe(false);
});
