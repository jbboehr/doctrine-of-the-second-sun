const { test, expect } = require("@playwright/test");

test("Firefox leaves documentation usable when the renderer cannot load", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/heliogenesis-scene.js", (route) => route.abort("failed"));
  await page.goto("/example/index.html");
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.heliogenesis?.mounted))).toBe(true);

  const activationResult = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    globalThis.heliogenesisEvents = [];
    for (const name of ["dawning", "idle", "unavailable"]) {
      document.documentElement.addEventListener(`heliogenesis:${name}`, () => {
        globalThis.heliogenesisEvents.push(name);
      });
    }

    globalThis.prepareCalls = 0;
    const prepare = controller.prepare.bind(controller);
    controller.prepare = (...args) => {
      globalThis.prepareCalls += 1;
      return prepare(...args);
    };

    const activated = await controller.activate();
    return {
      activated,
      events: globalThis.heliogenesisEvents,
      prepareCalls: globalThis.prepareCalls,
    };
  });

  expect(activationResult).toEqual({
    activated: false,
    events: ["dawning", "idle", "unavailable"],
    prepareCalls: 1,
  });
  await expect(page.locator("#secondSun")).toBeDisabled();
  await expect(page.locator("#secondSun")).toHaveAttribute("data-heliogenesis-unavailable", "");
  await expect(page.locator("main")).toBeVisible();

  const failedState = await page.evaluate(() => ({
    controllerState: globalThis.heliogenesis.state,
    documentState: document.documentElement.dataset.heliogenesisState,
    environmentState: document.querySelector("[data-heliogenesis-environment]").dataset.heliogenesisState,
    scene: globalThis.heliogenesis.scene,
    status: document.querySelector("[data-heliogenesis-status]").textContent,
  }));
  expect(failedState).toEqual({
    controllerState: "idle",
    documentState: "idle",
    environmentState: "idle",
    scene: null,
    status: "The visual event could not initialize in this browser.",
  });

  await page.evaluate(() => {
    const trigger = document.querySelector("#secondSun");
    trigger.dispatchEvent(new PointerEvent("pointerenter"));
    trigger.dispatchEvent(new FocusEvent("focus"));
  });
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => globalThis.prepareCalls)).toBe(1);

  await page.evaluate(() => globalThis.heliogenesis.destroy());
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  await expect(page.locator("[data-heliogenesis-status]")).toHaveCount(0);
  await expect(page.locator("#secondSun")).toBeEnabled();
  await expect(page.locator("#secondSun")).not.toHaveAttribute("data-heliogenesis-unavailable", "");
  expect(pageErrors).toEqual([]);
});
