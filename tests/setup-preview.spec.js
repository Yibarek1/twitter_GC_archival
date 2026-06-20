const { test, expect } = require("@playwright/test");

// A real 1x1 PNG, inlined so the test needs no built personal_data/ and no
// throwaway export folder — it runs identically on CI and locally.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

// The group photo input (step 2) lives in the DOM from load and needs no built
// data, so it's the cleanest surface to drive the shared preview helper that
// the person cards (step 3) also use.
test("a chosen photo previews before it is committed; cancel discards it", async ({ page }) => {
  await page.goto("/setup.html");
  const input = page.locator("#gc-photo");
  const modal = page.locator(".su-modal");
  const preview = page.locator("#gc-preview");

  // Picking a file opens an "is this good?" preview instead of committing.
  await input.setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: PNG_1x1 });
  await expect(modal).toBeVisible();
  await expect(modal).toHaveAttribute("role", "dialog");
  await expect(modal).toHaveAttribute("aria-modal", "true");
  await expect(modal.locator("img")).toHaveAttribute("src", /^data:image\/png/);

  // "Choose another" discards: the group avatar keeps its placeholder.
  await modal.getByRole("button", { name: /choose another/i }).click();
  await expect(modal).toBeHidden();
  await expect(preview).toHaveCSS("background-image", "none");
});

test("confirming the preview commits the photo", async ({ page }) => {
  await page.goto("/setup.html");
  const input = page.locator("#gc-photo");
  const modal = page.locator(".su-modal");
  const preview = page.locator("#gc-preview");

  await input.setInputFiles({ name: "pic.png", mimeType: "image/png", buffer: PNG_1x1 });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: /use this photo/i }).click();
  await expect(modal).toBeHidden();
  await expect(preview).toHaveCSS("background-image", /data:image/);
});

test("a non-image file is caught in the preview and cannot be used", async ({ page }) => {
  await page.goto("/setup.html");
  await page.locator("#gc-photo").setInputFiles({
    name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("definitely not an image"),
  });
  const modal = page.locator(".su-modal");
  await expect(modal).toBeVisible();
  await expect(modal.locator(".su-modal-msg")).toBeVisible();
  await expect(modal.getByRole("button", { name: /use this photo/i })).toBeDisabled();
});
