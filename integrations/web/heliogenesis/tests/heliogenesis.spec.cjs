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

async function holdSceneRequest(page) {
  let resolve;
  const request = new Promise((done) => { resolve = done; });
  await page.route("**/heliogenesis-scene.js", (route) => { resolve(route); });
  return { request };
}

test("reset cancels a pending activation without cancelling its replacement", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  const diagnostics = await openExample(page);
  await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
  const { request } = await holdSceneRequest(page);

  await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    globalThis.lifecycleEvents = [];
    for (const name of ["radiant", "receding", "idle"]) {
      controller.addEventListener(`heliogenesis:${name}`, () => globalThis.lifecycleEvents.push(name));
    }
    controller.timings.standard = { rise: 250, hold: 150, return: 150 };
    globalThis.cancelledActivation = controller.activate();
  });
  const route = await request;
  await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    controller.reset();
    globalThis.lifecycleEvents.length = 0;
    controller.timings.standard = { rise: 1500, hold: 500, return: 500 };
    globalThis.currentActivation = controller.activate();
  });
  await route.continue();

  expect(await page.evaluate(() => Promise.all([
    globalThis.cancelledActivation,
    globalThis.currentActivation,
  ]))).toEqual([false, true]);
  // Advance lifecycle timers without rendering every intermediate WebGL frame.
  await page.clock.fastForward(600);
  expect(await page.evaluate(() => globalThis.heliogenesis.state)).toBe("dawning");
  expect(await page.evaluate(() => globalThis.lifecycleEvents)).toEqual([]);
  await page.clock.fastForward(1900);
  expect(await page.evaluate(() => globalThis.lifecycleEvents)).toEqual(["radiant", "receding", "idle"]);
  await expect(page.locator("#secondSun")).toBeEnabled();
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("replacement activation reports its shared preparation failure", async ({ page }) => {
  const diagnostics = await openExample(page);
  const { request } = await holdSceneRequest(page);

  await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    globalThis.pendingActivation = controller.activate();
  });
  const route = await request;
  await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    controller.reset();
    globalThis.lifecycleEvents = [];
    for (const name of ["dawning", "idle", "unavailable"]) {
      controller.addEventListener(`heliogenesis:${name}`, () => globalThis.lifecycleEvents.push(name));
    }
    globalThis.currentActivation = controller.activate();
  });
  await route.abort("failed");

  expect(await page.evaluate(() => Promise.all([
    globalThis.pendingActivation,
    globalThis.currentActivation,
  ]))).toEqual([false, false]);
  expect(await page.evaluate(() => globalThis.lifecycleEvents)).toEqual(["dawning", "idle", "unavailable"]);
  await expect(page.locator("#secondSun")).toBeDisabled();
  await expect(page.locator("#secondSun")).toHaveAttribute("data-heliogenesis-unavailable", "");
  await expect(page.locator("[data-heliogenesis-status]"))
    .toHaveText("The visual event could not initialize in this browser.");
  expect(diagnostics.pageErrors).toEqual([]);
});

test("reset ignores a pending activation failure", async ({ page }) => {
  const diagnostics = await openExample(page);
  const { request } = await holdSceneRequest(page);
  await page.evaluate(() => {
    globalThis.pendingActivation = globalThis.heliogenesis.activate();
  });
  const route = await request;
  await page.evaluate(() => globalThis.heliogenesis.reset());
  await route.abort("failed");

  expect(await page.evaluate(() => globalThis.pendingActivation)).toBe(false);
  await expect(page.locator("#secondSun")).toBeEnabled();
  await expect(page.locator("#secondSun")).not.toHaveAttribute("data-heliogenesis-unavailable", "");
  expect(await page.evaluate(() => globalThis.heliogenesis.state)).toBe("idle");
  expect(diagnostics.pageErrors).toEqual([]);
});

for (const source of ["activate", "pointerenter", "focus"]) {
  test(`destroy ignores pending ${source} preparation failure`, async ({ page }) => {
    const diagnostics = await openExample(page);
    const { request } = await holdSceneRequest(page);
    await page.evaluate((preparationSource) => {
      const controller = globalThis.heliogenesis;
      globalThis.unavailableEvents = 0;
      controller.addEventListener("heliogenesis:unavailable", () => globalThis.unavailableEvents++);
      if (preparationSource === "activate") {
        globalThis.pendingOperation = controller.activate();
      } else {
        controller.trigger.dispatchEvent(new Event(preparationSource));
        globalThis.pendingOperation = controller.prepare().catch(() => null);
      }
    }, source);
    const route = await request;
    await page.evaluate(() => globalThis.heliogenesis.destroy());
    await route.abort("failed");
    await page.evaluate(() => globalThis.pendingOperation);

    await expect(page.locator("#secondSun")).toBeEnabled();
    await expect(page.locator("#secondSun")).not.toHaveAttribute("data-heliogenesis-unavailable", "");
    await expect(page.locator("html")).not.toHaveAttribute("data-heliogenesis-state");
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
    await expect(page.locator("[data-heliogenesis-status]")).toHaveCount(0);
    expect(await page.evaluate(() => globalThis.unavailableEvents)).toBe(0);
    expect(diagnostics.pageErrors).toEqual([]);
  });
}

test("remount isolates pending preparation from the destroyed mount", async ({ page }) => {
  const diagnostics = await openExample(page);
  const { request } = await holdSceneRequest(page);
  await page.evaluate(() => {
    globalThis.oldPreparation = globalThis.heliogenesis.prepare();
  });
  const route = await request;
  await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    controller.destroy();
    controller.mount();
    globalThis.newPreparation = controller.prepare();
  });
  await route.continue();

  const prepared = await page.evaluate(async () => {
    const oldScene = await globalThis.oldPreparation;
    const newScene = await globalThis.newPreparation;
    const controller = globalThis.heliogenesis;
    return {
      oldPreparationCancelled: oldScene === null,
      newSceneReady: newScene !== null && newScene === controller.scene,
      activated: await controller.activate(),
    };
  });
  expect(prepared).toEqual({ oldPreparationCancelled: true, newSceneReady: true, activated: true });
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(1);
  await page.evaluate(() => globalThis.heliogenesis.destroy());
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

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

    const sceneConfiguration = await page.evaluate(async () => {
      const scene = await globalThis.heliogenesis.prepare();
      return {
        controllerSunStyle: globalThis.heliogenesis.sunStyle,
        photosphere: scene.getPhotosphereDiagnostics(),
        quality: scene.quality,
        sceneSunStyle: scene.sunStyle,
      };
    });
    expect(["desktop", "compact", "narrow"]).toContain(sceneConfiguration.quality);
    expect(sceneConfiguration).toMatchObject({
      controllerSunStyle: "synthwave",
      photosphere: {
        hasSignalAttributes: true,
        shaderVariant: "synthwave",
        style: "synthwave",
        vertexCount: expect.any(Number),
      },
      sceneSunStyle: "synthwave",
    });
    expect(sceneConfiguration.photosphere.vertexCount).toBeGreaterThan(0);

    const activation = await page.evaluate(async () => {
      const controller = globalThis.heliogenesis;
      const activated = await controller.activate();
      const state = controller.state;
      const disabled = controller.trigger.disabled;
      const duplicate = await controller.activate();
      const frontStyle = getComputedStyle(document.querySelector(".heliogenesis-ignition-front"));
      return {
        activated,
        state,
        ignition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
        disabled,
        duplicate,
        frontAnimation: frontStyle.animationName,
        frontDuration: frontStyle.animationDuration,
      };
    });
    expect(activation).toEqual({
      activated: true,
      state: "dawning",
      ignition: true,
      disabled: true,
      duplicate: false,
      frontAnimation: "heliogenesis-ignition-front",
      frontDuration: "0.7s",
    });
    await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames)).toBeGreaterThan(0);
    await expect(page.locator(".heliogenesis-stage")).toHaveCount(1);

    const placement = await page.evaluate(() => {
      const rootStyle = document.documentElement.style;
      const environment = document.querySelector("[data-heliogenesis-environment]");
      return {
        sunX: Number.parseFloat(rootStyle.getPropertyValue("--heliogenesis-sun-x")),
        sunY: Number.parseFloat(rootStyle.getPropertyValue("--heliogenesis-sun-y")),
        viewportWidth: visualViewport.width,
        viewportHeight: visualViewport.height,
        viewportLeft: visualViewport.offsetLeft,
        viewportTop: visualViewport.offsetTop,
        environmentWidth: Number.parseFloat(environment.style.width),
        environmentHeight: Number.parseFloat(environment.style.height),
      };
    });
    expect(placement.sunX).toBeGreaterThan(placement.viewportLeft);
    expect(placement.sunX).toBeLessThan(placement.viewportLeft + placement.viewportWidth);
    expect(placement.sunY).toBeGreaterThan(placement.viewportTop);
    expect(placement.sunY).toBeLessThan(placement.viewportTop + placement.viewportHeight);
    expect(placement.environmentWidth).toBeCloseTo(placement.viewportWidth, 1);
    expect(placement.environmentHeight).toBeCloseTo(placement.viewportHeight, 1);

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
        resetIgnition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
        environmentCount: document.querySelectorAll("[data-heliogenesis-environment]").length,
      };
    });
    expect(replay).toEqual({
      activated: true,
      activeState: "dawning",
      resetState: "idle",
      resetIgnition: false,
      environmentCount: 1,
    });
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(1);

    await page.evaluate(() => globalThis.heliogenesis.destroy());
    await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
    await expect(page.locator("[data-heliogenesis-status]")).toHaveCount(0);
    await expect(page.locator("#secondSun")).not.toHaveAttribute("data-heliogenesis-trigger", "");
    expect(await page.evaluate(() => ({
      ignition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
      rise: document.documentElement.style.getPropertyValue("--heliogenesis-rise"),
      sunX: document.documentElement.style.getPropertyValue("--heliogenesis-sun-x"),
      sunY: document.documentElement.style.getPropertyValue("--heliogenesis-sun-y"),
    }))).toEqual({ ignition: false, rise: "", sunX: "", sunY: "" });

    expect(diagnostics.externalRequests).toEqual([]);
    expect(diagnostics.pageErrors).toEqual([]);
    expect(diagnostics.consoleErrors).toEqual([]);
  });
}

test("compiles distinct transmutation, synthwave, and natural photospheres", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    const original = globalThis.heliogenesis;
    const Controller = original.constructor;
    const trigger = original.trigger;
    const { DEFAULT_SUN_STYLE, SUN_STYLES } = await import("../heliogenesis.js");
    const defaultScene = await original.prepare();
    defaultScene.showReduced();
    const defaultPhotosphere = defaultScene.getPhotosphereDiagnostics();
    original.destroy();

    const transmutationController = new Controller({ trigger, sunStyle: "transmutation" }).mount();
    const transmutationScene = await transmutationController.prepare();
    transmutationScene.showReduced();
    const transmutation = {
      controllerSunStyle: transmutationController.sunStyle,
      photosphere: transmutationScene.getPhotosphereDiagnostics(),
      renderedFrames: transmutationScene.renderedFrames,
      sceneSunStyle: transmutationScene.sunStyle,
    };
    transmutationController.destroy();

    const naturalController = new Controller({ trigger, sunStyle: "natural" }).mount();
    const naturalScene = await naturalController.prepare();
    naturalScene.showReduced();
    const natural = {
      controllerSunStyle: naturalController.sunStyle,
      diagnosticsFrozen: Object.isFrozen(naturalScene.getPhotosphereDiagnostics()),
      photosphere: naturalScene.getPhotosphereDiagnostics(),
      renderedFrames: naturalScene.renderedFrames,
      sceneSunStyle: naturalScene.sunStyle,
    };
    naturalController.destroy();

    let invalidMessage = null;
    try {
      new Controller({ trigger, sunStyle: "ultraviolet" });
    } catch (error) {
      invalidMessage = error.message;
    }
    return {
      defaultPhotosphere,
      defaultSunStyle: DEFAULT_SUN_STYLE,
      invalidMessage,
      natural,
      sunStyles: [...SUN_STYLES],
      transmutation,
    };
  });

  expect(result.defaultSunStyle).toBe("synthwave");
  expect(result.sunStyles).toEqual(["synthwave", "transmutation", "natural"]);
  expect(result.invalidMessage).toBe(
    `Heliogenesis sunStyle must be one of: ${result.sunStyles.join(", ")}.`
  );
  expect(result.defaultPhotosphere).toMatchObject({
    hasSignalAttributes: true,
    shaderVariant: "synthwave",
    style: "synthwave",
  });
  expect(result.transmutation).toMatchObject({
    controllerSunStyle: "transmutation",
    photosphere: {
      hasSignalAttributes: false,
      shaderVariant: "transmutation",
      style: "transmutation",
    },
    renderedFrames: expect.any(Number),
    sceneSunStyle: "transmutation",
  });
  expect(result.natural).toMatchObject({
    controllerSunStyle: "natural",
    diagnosticsFrozen: true,
    photosphere: {
      hasSignalAttributes: false,
      shaderVariant: "natural",
      style: "natural",
    },
    renderedFrames: expect.any(Number),
    sceneSunStyle: "natural",
  });
  expect(result.defaultPhotosphere.vertexCount).toBeGreaterThan(0);
  expect(result.transmutation.photosphere.vertexCount).toBe(result.defaultPhotosphere.vertexCount);
  expect(result.natural.photosphere.vertexCount).toBeGreaterThan(result.defaultPhotosphere.vertexCount);
  expect(result.transmutation.renderedFrames).toBeGreaterThan(0);
  expect(result.natural.renderedFrames).toBeGreaterThan(0);
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("samples, reveals, resynchronizes, and disposes document tomography", async ({ page }) => {
  const diagnostics = await openExample(page);

  const prepared = await page.evaluate(async () => {
    const scene = await globalThis.heliogenesis.prepare();
    const tomography = scene.getTomographyDiagnostics();
    return { frozen: Object.isFrozen(tomography), tomography };
  });
  expect(prepared.frozen).toBe(true);
  expect(prepared.tomography.sampledElements).toBeGreaterThanOrEqual(4);
  expect(prepared.tomography.flowObstacles).toBeGreaterThanOrEqual(2);
  expect(prepared.tomography.visible).toBe(false);

  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => globalThis.heliogenesis.scene
    .getTomographyDiagnostics().synchronizations))
    .toBe(prepared.tomography.synchronizations);

  await page.evaluate(async () => {
    globalThis.heliogenesis.timings.standard = { rise: 2400, hold: 10_000, return: 200 };
    await globalThis.heliogenesis.activate();
  });
  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.scene
    .getTomographyDiagnostics().visible), { timeout: 2_000 }).toBe(true);

  const activeScroll = await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    const synchronizations = controller.scene.getTomographyDiagnostics().synchronizations;
    window.dispatchEvent(new Event("scroll"));
    return { state: controller.state, synchronizations };
  });
  expect(activeScroll.state).not.toBe("idle");
  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.scene
    .getTomographyDiagnostics().synchronizations)).toBeGreaterThan(activeScroll.synchronizations);

  const disposed = await page.evaluate(() => {
    const controller = globalThis.heliogenesis;
    const scene = controller.scene;
    controller.reset({ announce: false });
    const afterReset = scene.getTomographyDiagnostics();
    controller.destroy();
    return {
      afterDestroy: scene.getTomographyDiagnostics(),
      afterReset,
    };
  });
  expect(disposed.afterReset.visible).toBe(false);
  expect(disposed.afterReset.sampledElements).toBe(prepared.tomography.sampledElements);
  expect(disposed.afterDestroy).toEqual({
    flowObstacles: 0,
    sampledElements: 0,
    synchronizations: 0,
    visible: false,
  });
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);

  const remounted = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    const replacementHook = document.createElement("aside");
    replacementHook.dataset.heliogenesisCallout = "";
    document.querySelector("[data-heliogenesis-surface]").append(replacementHook);
    controller.mount();
    const tomography = (await controller.prepare()).getTomographyDiagnostics();
    controller.destroy();
    return tomography;
  });
  expect(remounted.sampledElements).toBe(prepared.tomography.sampledElements + 1);
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("reset cancels queued geometry work and remains reusable", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    const scene = await controller.prepare();
    await controller.activate();

    const beforeResize = scene.getTomographyDiagnostics().synchronizations;
    controller.queueResize();
    const resizeQueued = controller.resizeTimer !== null;
    controller.reset({ announce: false });
    const afterResizeReset = {
      documentSyncTimer: controller.documentSyncTimer,
      resizeTimer: controller.resizeTimer,
    };
    await new Promise((resolve) => setTimeout(resolve, 180));
    const afterResizeDelay = scene.getTomographyDiagnostics().synchronizations;

    const reactivated = await controller.activate();
    const beforeDocumentSync = scene.getTomographyDiagnostics().synchronizations;
    controller.queueDocumentSync();
    const documentSyncQueued = controller.documentSyncTimer !== null;
    controller.reset({ announce: false });
    const afterDocumentSyncReset = {
      documentSyncTimer: controller.documentSyncTimer,
      resizeTimer: controller.resizeTimer,
    };
    await new Promise((resolve) => setTimeout(resolve, 180));

    return {
      afterDocumentSyncDelay: scene.getTomographyDiagnostics().synchronizations,
      afterDocumentSyncReset,
      afterResizeDelay,
      afterResizeReset,
      beforeDocumentSync,
      beforeResize,
      documentSyncQueued,
      finalState: controller.state,
      reactivated,
      resizeQueued,
    };
  });

  expect(result.resizeQueued).toBe(true);
  expect(result.afterResizeReset).toEqual({
    documentSyncTimer: null,
    resizeTimer: null,
  });
  expect(result.afterResizeDelay).toBe(result.beforeResize);
  expect(result.reactivated).toBe(true);
  expect(result.beforeDocumentSync).toBeGreaterThan(result.beforeResize);
  expect(result.documentSyncQueued).toBe(true);
  expect(result.afterDocumentSyncReset).toEqual({
    documentSyncTimer: null,
    resizeTimer: null,
  });
  expect(result.afterDocumentSyncDelay).toBe(result.beforeDocumentSync);
  expect(result.finalState).toBe("idle");
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("destroy cancels pending debounce callbacks", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    const callbacks = { resize: 0 };
    await controller.prepare();
    // A sentinel callback stays observable after destroy releases the scene.
    controller.resizeTimer = setTimeout(() => { callbacks.resize += 1; }, 140);

    controller.destroy();
    const immediate = {
      documentSyncTimer: controller.documentSyncTimer,
      mounted: controller.mounted,
      resizeTimer: controller.resizeTimer,
    };
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { callbacks, immediate };
  });

  expect(result.immediate).toEqual({
    documentSyncTimer: null,
    mounted: false,
    resizeTimer: null,
  });
  expect(result.callbacks).toEqual({ resize: 0 });
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("failure cancels pending debounce callbacks", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    const callbacks = { documentSync: 0, resize: 0 };
    // The real queue methods cannot leave both debounce slots pending at once.
    controller.resizeTimer = setTimeout(() => { callbacks.resize += 1; }, 140);
    controller.documentSyncTimer = setTimeout(() => { callbacks.documentSync += 1; }, 140);

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      controller.fail(new Error("Forced debounce cleanup test failure."));
    } finally {
      console.error = originalConsoleError;
    }

    const immediate = {
      documentSyncTimer: controller.documentSyncTimer,
      resizeTimer: controller.resizeTimer,
    };
    await new Promise((resolve) => setTimeout(resolve, 180));
    controller.destroy();
    return { callbacks, immediate };
  });

  expect(result.immediate).toEqual({
    documentSyncTimer: null,
    resizeTimer: null,
  });
  expect(result.callbacks).toEqual({ documentSync: 0, resize: 0 });
  await expect(page.locator("[data-heliogenesis-environment]")).toHaveCount(0);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("cold activation synchronizes CSS ignition with a custom renderer rise", async ({ page }) => {
  const diagnostics = await openExample(page);

  const result = await page.evaluate(async () => {
    const controller = globalThis.heliogenesis;
    const customRise = 900;
    controller.timings.standard = { rise: customRise, hold: 250, return: 250 };

    const originalPrepare = controller.prepare.bind(controller);
    let sceneStart = 0;
    let radiantAt = 0;
    let rendererRise = 0;
    let ignitionAtSceneStart = false;
    controller.prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 180));
      const scene = await originalPrepare();
      return {
        showReduced: () => scene.showReduced(),
        start: (options) => {
          sceneStart = performance.now();
          rendererRise = options.rise;
          ignitionAtSceneStart = document.documentElement.hasAttribute("data-heliogenesis-ignition")
            && document.querySelector("[data-heliogenesis-environment]")
              .hasAttribute("data-heliogenesis-ignition");
          scene.start(options);
        },
      };
    };
    document.documentElement.addEventListener("heliogenesis:radiant", () => {
      radiantAt = performance.now();
    }, { once: true });

    const activation = controller.activate();
    const front = document.querySelector(".heliogenesis-ignition-front");
    const beforePreparation = {
      state: controller.state,
      rootIgnition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
      environmentIgnition: document.querySelector("[data-heliogenesis-environment]")
        .hasAttribute("data-heliogenesis-ignition"),
      animation: getComputedStyle(front).animationName,
    };

    const activated = await activation;
    const frontStyle = getComputedStyle(front);
    const afterPreparation = {
      activated,
      rootIgnition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
      environmentIgnition: document.querySelector("[data-heliogenesis-environment]")
        .hasAttribute("data-heliogenesis-ignition"),
      animation: frontStyle.animationName,
      duration: frontStyle.animationDuration,
      rendererRise,
      ignitionAtSceneStart,
    };

    await new Promise((resolve) => {
      document.documentElement.addEventListener("heliogenesis:radiant", resolve, { once: true });
    });
    const radiant = {
      state: controller.state,
      ignition: document.documentElement.hasAttribute("data-heliogenesis-ignition"),
      elapsedFromSceneStart: radiantAt - sceneStart,
    };
    controller.reset({ announce: false });
    return { beforePreparation, afterPreparation, radiant };
  });

  expect(result.beforePreparation).toEqual({
    state: "dawning",
    rootIgnition: false,
    environmentIgnition: false,
    animation: "none",
  });
  expect(result.afterPreparation).toEqual({
    activated: true,
    rootIgnition: true,
    environmentIgnition: true,
    animation: "heliogenesis-ignition-front",
    duration: "0.9s",
    rendererRise: 900,
    ignitionAtSceneStart: true,
  });
  expect(result.radiant.state).toBe("radiant");
  expect(result.radiant.ignition).toBe(false);
  expect(result.radiant.elapsedFromSceneStart).toBeGreaterThanOrEqual(850);
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test("document lighting overrides explicit theme colors and restores them on reset", async ({ page }) => {
  const diagnostics = await openExample(page);
  await configureShortEvent(page);

  const colors = await page.evaluate(async () => {
    const theme = document.createElement("style");
    theme.textContent = `
      [data-heliogenesis-chrome], [data-heliogenesis-surface], [data-heliogenesis-code] {
        transition: none !important;
      }
      main h1, main h2, main h3, main h4, main h5, main h6 { color: rgb(240 232 219); }
    `;
    document.head.append(theme);
    const header = document.querySelector("[data-heliogenesis-chrome]");
    header.id = "mdbook-menu-bar";
    header.style.backgroundColor = "rgb(13 14 18)";

    const controller = globalThis.heliogenesis;
    const heading = document.querySelector("[data-heliogenesis-surface] h1");
    const paragraph = document.querySelector("[data-heliogenesis-surface] article p");
    const code = document.querySelector("[data-heliogenesis-code]");
    const before = {
      heading: getComputedStyle(heading).color,
      chrome: getComputedStyle(header).backgroundColor,
    };

    await controller.prepare();
    await controller.activate();
    const active = {
      surface: getComputedStyle(document.querySelector("[data-heliogenesis-surface]")).color,
      heading: getComputedStyle(heading).color,
      paragraph: getComputedStyle(paragraph).color,
      code: getComputedStyle(code).color,
      chrome: getComputedStyle(header).backgroundColor,
    };

    controller.reset({ announce: false });
    const reset = {
      heading: getComputedStyle(heading).color,
      chrome: getComputedStyle(header).backgroundColor,
    };
    return { before, active, reset };
  });

  expect(colors).toEqual({
    before: {
      heading: "rgb(240, 232, 219)",
      chrome: "rgb(13, 14, 18)",
    },
    active: {
      surface: "rgb(33, 30, 44)",
      heading: "rgb(33, 30, 44)",
      paragraph: "rgb(33, 30, 44)",
      code: "rgb(233, 229, 239)",
      chrome: "rgb(13, 14, 18)",
    },
    reset: {
      heading: "rgb(240, 232, 219)",
      chrome: "rgb(13, 14, 18)",
    },
  });
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

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
      rootIgnition: root.hasAttribute("data-heliogenesis-ignition"),
      documentState: document.documentElement.getAttribute("data-heliogenesis-state"),
      environmentState: environment.dataset.heliogenesisState,
      environmentIgnition: environment.hasAttribute("data-heliogenesis-ignition"),
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
    rootIgnition: true,
    documentState: null,
    environmentState: "dawning",
    environmentIgnition: true,
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

  const reducedFrame = await page.evaluate(async () => {
    const activated = await globalThis.heliogenesis.activate();
    const front = document.querySelector(".heliogenesis-ignition-front");
    const style = getComputedStyle(front);
    return {
      activated,
      animation: style.animationName,
      opacity: Number.parseFloat(style.opacity),
      renderedFrames: globalThis.heliogenesis.scene.renderedFrames,
      tomography: globalThis.heliogenesis.scene.getTomographyDiagnostics(),
    };
  });
  expect(reducedFrame).toEqual({
    activated: true,
    animation: "none",
    opacity: 0.18,
    renderedFrames: expect.any(Number),
    tomography: {
      flowObstacles: expect.any(Number),
      sampledElements: expect.any(Number),
      synchronizations: expect.any(Number),
      visible: false,
    },
  });
  expect(reducedFrame.renderedFrames).toBeGreaterThan(0);
  expect(reducedFrame.tomography.sampledElements).toBeGreaterThanOrEqual(4);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames))
    .toBe(reducedFrame.renderedFrames);

  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.state), { timeout: 4_000 }).toBe("idle");
  await expect(page.locator("#secondSun")).toBeEnabled();
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});
