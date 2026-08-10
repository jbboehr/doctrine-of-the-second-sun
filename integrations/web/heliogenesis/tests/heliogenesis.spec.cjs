const { test, expect } = require("@playwright/test");

const eventNames = ["dawning", "radiant", "receding", "idle"];

async function openExample(page, pageScale = 1) {
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol === "http:" && url.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(request.url());
    }
    if (url.protocol === "https:") externalRequests.push(request.url());
  });

  await page.goto("/example/index.html");
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.heliogenesis?.mounted))).toBe(true);

  if (pageScale !== 1) {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setPageScaleFactor", { pageScaleFactor: pageScale });
    await expect.poll(() => page.evaluate(() => globalThis.visualViewport?.scale || 1)).toBe(pageScale);
  }

  return { consoleErrors, pageErrors, externalRequests };
}

async function configureShortEvent(page, motion = "standard") {
  await page.evaluate((selectedMotion) => {
    globalThis.heliogenesis.timings[selectedMotion] = {
      rise: 700,
      hold: 350,
      return: 350,
    };
  }, motion);
}

for (const pageScale of [1, 1.5]) {
  test(`renders and resets the complete event at ${pageScale}x page scale`, async ({ page }) => {
    const diagnostics = await openExample(page, pageScale);
    await configureShortEvent(page);

    await page.evaluate((names) => {
      globalThis.heliogenesisEvents = [];
      names.forEach((name) => {
        document.documentElement.addEventListener(`heliogenesis:${name}`, () => {
          globalThis.heliogenesisEvents.push(name);
        });
      });
    }, eventNames);

    const quality = await page.evaluate(async () => {
      const scene = await globalThis.heliogenesis.prepare();
      return scene.quality;
    });
    expect(["desktop", "compact", "narrow"]).toContain(quality);

    const activation = await page.evaluate(async () => {
      const controller = globalThis.heliogenesis;
      const activated = await controller.activate();
      const state = controller.state;
      const disabled = controller.trigger.disabled;
      const duplicate = await controller.activate();
      return { activated, state, disabled, duplicate };
    });
    expect(activation).toEqual({
      activated: true,
      state: "dawning",
      disabled: true,
      duplicate: false,
    });
    await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames)).toBeGreaterThan(0);
    await expect(page.locator(".heliogenesis-stage")).toHaveCount(1);

    const canvasBox = await page.locator(".heliogenesis-stage").boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox.width).toBeGreaterThan(0);
    expect(canvasBox.height).toBeGreaterThan(0);

    await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.state), { timeout: 4_000 }).toBe("idle");
    expect(await page.evaluate(() => globalThis.heliogenesisEvents)).toEqual(eventNames);
    await expect(page.locator("#secondSun")).toBeEnabled();
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(1);

    const replay = await page.evaluate(async () => {
      const controller = globalThis.heliogenesis;
      const activated = await controller.activate();
      const activeState = controller.state;
      controller.reset({ announce: false });
      return {
        activated,
        activeState,
        resetState: controller.state,
        environmentCount: document.querySelectorAll("[data-heliogenesis-environment]").length,
      };
    });
    expect(replay).toEqual({
      activated: true,
      activeState: "dawning",
      resetState: "idle",
      environmentCount: 1,
    });
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(1);

    await page.evaluate(() => globalThis.heliogenesis.destroy());
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
    await expect(page.locator("[data-heliogenesis-status]")).toHaveCount(0);
    await expect(page.locator("#secondSun")).not.toHaveAttribute("data-heliogenesis-trigger", "");

    expect(diagnostics.externalRequests).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.consoleErrors).toEqual([]);
  });
}

test("mirrors state when the state root and environment mount are siblings", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    globalThis.heliogenesis.destroy();
    const trigger = document.querySelector("#secondSun");
    const root = document.querySelector("main");
    const Controller = globalThis.heliogenesis.constructor;
    const controller = new Controller({
      trigger,
      root,
      mount: document.body,
      timings: { standard: { rise: 500, hold: 250, return: 250 } },
    }).mount();

    const activation = controller.activate();
    await new Promise((resolve) => setTimeout(resolve, 220));
    const environment = document.querySelector("[data-heliogenesis-environment]");
    const snapshot = {
      rootState: root.dataset.heliogenesisState,
      documentState: document.documentElement.getAttribute("data-heliogenesis-state"),
      environmentState: environment.dataset.heliogenesisState,
      environmentOpacity: Number.parseFloat(getComputedStyle(environment).opacity),
      mountedInBody: environment.parentElement === document.body,
    };

    controller.reset({ announce: false });
    await activation;
    controller.destroy();
    return snapshot;
  });

  expect(result).toEqual({
    rootState: "dawning",
    documentState: null,
    environmentState: "dawning",
    environmentOpacity: expect.any(Number),
    mountedInBody: true,
  });
  expect(result.environmentOpacity).toBeGreaterThan(0);
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("reduced motion renders one meaningful static frame", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const diagnostics = await openExample(page);
  await configureShortEvent(page, "reduced");

  await page.evaluate(() => globalThis.heliogenesis.activate());
  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.scene?.renderedFrames || 0)).toBeGreaterThan(0);
  const frameCount = await page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames)).toBe(frameCount);

  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.state), { timeout: 4_000 }).toBe("idle");
  await expect(page.locator("#secondSun")).toBeEnabled();
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});
