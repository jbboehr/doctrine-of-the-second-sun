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
    };
  });
  expect(reducedFrame).toEqual({
    activated: true,
    animation: "none",
    opacity: 0.18,
    renderedFrames: expect.any(Number),
  });
  expect(reducedFrame.renderedFrames).toBeGreaterThan(0);
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => globalThis.heliogenesis.scene.renderedFrames))
    .toBe(reducedFrame.renderedFrames);

  await expect.poll(() => page.evaluate(() => globalThis.heliogenesis.state), { timeout: 4_000 }).toBe("idle");
  await expect(page.locator("#secondSun")).toBeEnabled();
  expect(diagnostics.externalRequests).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});
