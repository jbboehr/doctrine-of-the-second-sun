const { test, expect } = require("@playwright/test");

test("leaves the document unchanged when WebGL is unavailable", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getSupportedContext(type, ...args) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto("/example/index.html");
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.documentLooksBack?.mounted))).toBe(true);

  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(false);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
  expect(await page.evaluate(() => CSS.highlights.get("document-looks-back-glyph").size)).toBe(0);
  await expect(page.locator("main")).toBeVisible();
  await page.evaluate(() => globalThis.documentLooksBack.destroy());
  expect(pageErrors).toEqual([]);
});
