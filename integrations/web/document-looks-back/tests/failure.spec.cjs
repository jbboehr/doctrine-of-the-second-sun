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

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const findCandidates = controller.findCandidates.bind(controller);
    const prepareCandidate = controller.prepareCandidate.bind(controller);
    let scans = 0;
    let attemptsAfterUnavailable = 0;
    controller.findCandidates = () => {
      scans += 1;
      return findCandidates();
    };
    controller.prepareCandidate = candidate => {
      if (controller.rendererUnavailable) attemptsAfterUnavailable += 1;
      return prepareCandidate(candidate);
    };
    return {
      first: controller.summon(),
      second: controller.summon(),
      rendererUnavailable: controller.rendererUnavailable,
      scans,
      attemptsAfterUnavailable,
    };
  });
  expect(result).toEqual({
    first: false,
    second: false,
    rendererUnavailable: true,
    scans: 1,
    attemptsAfterUnavailable: 0,
  });
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
  await expect(page.locator("main")).toBeVisible();
  await page.evaluate(() => globalThis.documentLooksBack.destroy());
  expect(pageErrors).toEqual([]);
});
