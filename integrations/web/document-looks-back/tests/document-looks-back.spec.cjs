const { test, expect } = require("@playwright/test");

async function openExample(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "data:" && url.origin !== "http://127.0.0.1:4174") externalRequests.push(request.url());
  });
  await page.goto("/example/index.html");
  await expect.poll(() => page.evaluate(() => Boolean(globalThis.documentLooksBack?.mounted))).toBe(true);
  return { consoleErrors, pageErrors, externalRequests };
}

async function configure(page, options) {
  await page.evaluate((configuration) => {
    globalThis.documentLooksBack.destroy();
    globalThis.documentLooksBack = new globalThis.DocumentLooksBack(configuration).mount();
  }, options);
}

async function addRetryCandidates(page) {
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "retry-boundary";
    target.style.cssText = [
      "position:fixed",
      "left:160px",
      "top:240px",
      "display:flex",
      "font-size:32px",
      "line-height:1",
    ].join(";");
    for (let signature = 0; signature < 15; signature += 1) {
      for (let duplicate = 0; duplicate < 2; duplicate += 1) {
        const candidate = document.createElement("span");
        candidate.dataset.signature = String(signature);
        candidate.style.fontFamily = `"retry-${signature}", serif`;
        candidate.textContent = "o";
        target.append(candidate);
      }
    }
    document.body.append(target);
  });
}

test("enforces maxEyes and removes render surfaces after duration", async ({ page }) => {
  const diagnostics = await openExample(page);
  await configure(page, { maxEyes: 2, duration: 700, frequency: 0 });
  expect(await page.evaluate(() => [
    globalThis.documentLooksBack.summon(),
    globalThis.documentLooksBack.summon(),
    globalThis.documentLooksBack.summon(),
  ])).toEqual([true, true, false]);
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(2);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(2);
  expect(await page.evaluate(() => CSS.highlights?.has("document-looks-back-glyph") || false)).toBe(false);

  await page.waitForTimeout(800);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(0);
  expect(diagnostics).toEqual({ consoleErrors: [], pageErrors: [], externalRequests: [] });
});

test("supports fixed automatic frequency and disabled automatic spawning", async ({ page }) => {
  await openExample(page);
  await configure(page, { maxEyes: 2, duration: 700, frequency: 250 });
  await expect.poll(() => page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBeGreaterThan(0);

  await configure(page, { maxEyes: 2, duration: 700, frequency: 0 });
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(0);
});

test("reuses bounded renderers without reporting context loss", async ({ page }) => {
  const diagnostics = await openExample(page);
  await configure(page, { maxEyes: 3, duration: 500, frequency: 0 });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    expect(await page.evaluate(() => Array.from(
      { length: 3 },
      () => globalThis.documentLooksBack.summon()
    ))).toEqual([true, true, true]);
    await expect(page.locator(".document-looks-back-witness")).toHaveCount(3);
    await page.evaluate(() => globalThis.documentLooksBack.reset());
    await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
  }
  expect(diagnostics.consoleErrors.filter(message => /context.*lost/i.test(message))).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
});

test("reduced motion renders one static eye for the configured duration", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExample(page);
  await configure(page, { maxEyes: 1, duration: 600, frequency: 0 });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(1);
  await page.waitForTimeout(700);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
});

test("preserves eye contrast for dark and light text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExample(page);
  await page.evaluate(() => {
    for (const [mode, colors] of [["dark", ["#17141d", "#f4f0e8"]], ["light", ["#f4f0f8", "#11101b"]]]) {
      const target = document.createElement("div");
      target.className = "contrast-glyph";
      target.dataset.palette = mode;
      target.textContent = "o";
      target.style.cssText = [
        "position:fixed",
        `left:${mode === "dark" ? 240 : 520}px`,
        "top:180px",
        "padding:16px",
        `color:${colors[0]}`,
        `background:${colors[1]}`,
        "font:18px Georgia",
        "line-height:1",
      ].join(";");
      document.body.append(target);
    }
  });
  await configure(page, {
    duration: 3000,
    frequency: 0,
    maxEyes: 2,
    selector: ".contrast-glyph",
  });
  expect(await page.evaluate(() => [
    globalThis.documentLooksBack.summon(),
    globalThis.documentLooksBack.summon(),
  ])).toEqual([true, true]);

  // Two backing colors let the test recover canvas alpha and inspect the composited pixels the reader sees.
  const backing = await page.addStyleTag({ content: `
    html,
    body,
    body *:not(.document-looks-back-witness) {
      background: #000 !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }
  ` });
  const witnesses = await page.locator(".document-looks-back-witness").all();
  const blackBacked = await Promise.all(witnesses.map(async (witness) =>
    (await witness.screenshot()).toString("base64")
  ));
  await backing.evaluate((style) => {
    style.textContent = style.textContent.replace("#000", "#fff");
  });
  const whiteBacked = await Promise.all(witnesses.map(async (witness) =>
    (await witness.screenshot()).toString("base64")
  ));
  const samples = [];
  for (let index = 0; index < witnesses.length; index += 1) {
    samples.push(await page.evaluate(async ({ blackSource, whiteSource }) => {
      const loadImage = async (source) => {
        const image = new Image();
        image.src = `data:image/png;base64,${source}`;
        await image.decode();
        return image;
      };
      const [blackImage, whiteImage] = await Promise.all([loadImage(blackSource), loadImage(whiteSource)]);
      const sample = document.createElement("canvas");
      sample.width = blackImage.width;
      sample.height = blackImage.height;
      const context = sample.getContext("2d", { willReadFrequently: true });
      context.drawImage(blackImage, 0, 0);
      const blackPixels = context.getImageData(0, 0, sample.width, sample.height).data;
      context.clearRect(0, 0, sample.width, sample.height);
      context.drawImage(whiteImage, 0, 0);
      const whitePixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let dark = 0;
      let light = 0;
      let opaque = 0;
      for (let offset = 0; offset < blackPixels.length; offset += 4) {
        const transmission = (
          whitePixels[offset] - blackPixels[offset]
          + whitePixels[offset + 1] - blackPixels[offset + 1]
          + whitePixels[offset + 2] - blackPixels[offset + 2]
        ) / (3 * 255);
        const alpha = 1 - transmission;
        if (alpha < 0.2) continue;
        const red = Math.min(255, blackPixels[offset] / alpha);
        const green = Math.min(255, blackPixels[offset + 1] / alpha);
        const blue = Math.min(255, blackPixels[offset + 2] / alpha);
        const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;
        opaque += 1;
        if (luminance < 0.55) dark += 1;
        if (luminance > 0.65) light += 1;
      }
      return {
        dark: dark / opaque,
        light: light / opaque,
        opaque,
      };
    }, { blackSource: blackBacked[index], whiteSource: whiteBacked[index] }));
  }
  expect(samples).toHaveLength(2);
  for (const sample of samples) {
    expect(sample.opaque).toBeGreaterThan(0);
    expect(sample.dark).toBeGreaterThan(0.035);
    expect(sample.light).toBeGreaterThan(0.035);
  }
});

test("keeps a reduced-motion eye attached to its glyph while scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "moving-glyph";
    target.textContent = "o";
    target.style.cssText = "position:absolute;left:240px;top:320px;font:64px Georgia";
    document.body.append(target);
  });
  await configure(page, { maxEyes: 1, duration: 1000, frequency: 0, selector: "#moving-glyph" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);

  const before = await page.locator(".document-looks-back-witness").evaluate((canvas) =>
    Number.parseFloat(canvas.style.top)
  );
  await page.evaluate(() => window.scrollBy(0, 24));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const after = await page.locator(".document-looks-back-witness").evaluate((canvas) =>
    Number.parseFloat(canvas.style.top)
  );
  expect(after).toBeCloseTo(before - 24, 0);
});

test("scans visible glyphs in containers much taller than the viewport", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "long-container";
    target.textContent = "observer";
    target.style.cssText = "position:absolute;left:240px;top:120px;height:30000px;font:32px Georgia";
    document.body.append(target);
  });
  await configure(page, { maxEyes: 1, duration: 700, frequency: 0, selector: "#long-container" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);
});

test("reuses one discovery pass when a glyph fails on a long document", async ({ page }) => {
  const diagnostics = await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "retry-text";
    target.style.cssText = "position:absolute;left:20px;top:200px;width:800px;font:16px serif";
    target.textContent = "ooooo "
      + "Observers receive a stable snapshot after the current transaction commits. ".repeat(1000);
    document.body.append(target);
  });
  await configure(page, { frequency: 0, selector: "#retry-text" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const findCandidates = controller.findCandidates.bind(controller);
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    const random = Math.random;
    let scans = 0;
    const sampledGlyphs = [];
    controller.findCandidates = () => {
      scans += 1;
      return findCandidates();
    };
    // Keep DOM order and simulate a font that supplies no ink for lowercase o.
    Math.random = () => 0.5;
    CanvasRenderingContext2D.prototype.fillText = function sampleText(text, ...args) {
      sampledGlyphs.push(text);
      if (text === "o") return;
      return fillText.call(this, text, ...args);
    };
    try {
      return {
        summoned: controller.summon(),
        activeCount: controller.activeCount,
        scans,
        sampledGlyphs,
      };
    } finally {
      Math.random = random;
      CanvasRenderingContext2D.prototype.fillText = fillText;
    }
  });

  expect(result.summoned).toBe(true);
  expect(result.activeCount).toBe(1);
  expect(result.sampledGlyphs).toEqual(["o", "O"]);
  expect(result.scans).toBe(1);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(1);
  expect(diagnostics).toEqual({ consoleErrors: [], pageErrors: [], externalRequests: [] });
});

test("allows the fourteenth distinct glyph signature after thirteen preparation failures", async ({ page }) => {
  await openExample(page);
  await addRetryCandidates(page);
  await configure(page, { frequency: 0, selector: "#retry-boundary" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    const random = Math.random;
    const sampledSignatures = [];
    Math.random = () => 0.5;
    CanvasRenderingContext2D.prototype.fillText = function failFirstThirteen(text, ...args) {
      const signature = Number(/retry-(\d+)/.exec(this.font)?.[1]);
      sampledSignatures.push(signature);
      if (signature < 13) return;
      return fillText.call(this, text, ...args);
    };
    try {
      const summoned = controller.summon();
      const [active] = controller.activeEyes;
      return {
        activeCount: controller.activeCount,
        sampledSignatures,
        selectedSignature: Number(active?.candidate.node.parentElement?.dataset.signature),
        summoned,
      };
    } finally {
      Math.random = random;
      CanvasRenderingContext2D.prototype.fillText = fillText;
    }
  });

  expect(result).toEqual({
    activeCount: 1,
    sampledSignatures: Array.from({ length: 14 }, (_, index) => index),
    selectedSignature: 13,
    summoned: true,
  });
});

test("stops after fourteen distinct failed glyph signatures", async ({ page }) => {
  await openExample(page);
  await addRetryCandidates(page);
  await configure(page, { frequency: 0, selector: "#retry-boundary" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const findCandidates = controller.findCandidates.bind(controller);
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    const random = Math.random;
    const sampledSignatures = [];
    let scans = 0;
    controller.findCandidates = () => {
      scans += 1;
      return findCandidates();
    };
    Math.random = () => 0.5;
    CanvasRenderingContext2D.prototype.fillText = function rejectGlyph() {
      sampledSignatures.push(Number(/retry-(\d+)/.exec(this.font)?.[1]));
    };
    try {
      const summoned = controller.summon();
      return {
        activeCount: controller.activeCount,
        sampledSignatures,
        scans,
        summoned,
      };
    } finally {
      Math.random = random;
      CanvasRenderingContext2D.prototype.fillText = fillText;
    }
  });

  expect(result).toEqual({
    activeCount: 0,
    sampledSignatures: Array.from({ length: 14 }, (_, index) => index),
    scans: 1,
    summoned: false,
  });
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
});

test("revalidates final visibility before retrying the next discovered candidate", async ({ page }) => {
  await openExample(page);
  await page.addStyleTag({ content: `
    body:has(> .document-looks-back-witness) #late-hidden-glyph {
      visibility: hidden;
    }
  ` });
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "late-visibility-candidates";
    target.style.cssText = "position:fixed;left:240px;top:200px;font:64px Georgia";
    target.innerHTML = [
      "<span id='late-hidden-glyph'>o</span>",
      "<span id='fallback-glyph'>a</span>",
    ].join("");
    document.body.append(target);
  });
  await configure(page, { frequency: 0, selector: "#late-visibility-candidates" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const findCandidates = controller.findCandidates.bind(controller);
    const random = Math.random;
    let scans = 0;
    controller.findCandidates = () => {
      scans += 1;
      return findCandidates();
    };
    Math.random = () => 0.5;
    try {
      const summoned = controller.summon();
      const [active] = controller.activeEyes;
      return {
        activeCount: controller.activeCount,
        scans,
        selected: active?.candidate.node.parentElement?.id,
        summoned,
      };
    } finally {
      Math.random = random;
    }
  });

  expect(result).toEqual({
    activeCount: 1,
    scans: 1,
    selected: "fallback-glyph",
    summoned: true,
  });
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(1);
});

test("keeps retries inside the centered candidate pool", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const centered = document.createElement("span");
    centered.className = "centering-candidate";
    centered.textContent = "o";
    centered.style.cssText = "position:fixed;left:240px;top:240px;font:64px Georgia";
    const offCenter = document.createElement("span");
    offCenter.className = "centering-candidate";
    offCenter.textContent = "a";
    offCenter.style.cssText = "position:fixed;left:240px;top:20px;font:64px Georgia";
    document.body.append(centered, offCenter);
  });
  await configure(page, { frequency: 0, selector: ".centering-candidate" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    const sampledGlyphs = [];
    CanvasRenderingContext2D.prototype.fillText = function failCenteredGlyph(text, ...args) {
      sampledGlyphs.push(text);
      if (text === "o") return;
      return fillText.call(this, text, ...args);
    };
    try {
      const summoned = controller.summon();
      return {
        activeCount: controller.activeCount,
        sampledGlyphs,
        summoned,
      };
    } finally {
      CanvasRenderingContext2D.prototype.fillText = fillText;
    }
  });

  expect(result).toEqual({
    activeCount: 0,
    sampledGlyphs: ["o"],
    summoned: false,
  });
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
});

test("refreshes candidates between summons after occupancy and text changes", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "changing-glyph";
    target.textContent = "o";
    target.style.cssText = "position:fixed;left:240px;top:160px;font:64px Georgia";
    document.body.append(target);
  });
  await configure(page, { maxEyes: 2, frequency: 0, selector: "#changing-glyph" });

  const result = await page.evaluate(() => {
    const controller = globalThis.documentLooksBack;
    const target = document.getElementById("changing-glyph");
    const first = controller.summon();
    const occupied = controller.summon();
    controller.reset();
    target.textContent = "a";
    target.style.left = "400px";
    const replaced = controller.summon();
    const [active] = controller.activeEyes;
    return {
      first,
      occupied,
      replaced,
      activeCount: controller.activeCount,
      usesReplacement: active?.candidate.node === target.firstChild,
      glyph: active?.candidate.glyph,
      left: active?.candidate.rect.left,
    };
  });

  expect(result).toEqual({
    first: true,
    occupied: false,
    replaced: true,
    activeCount: 1,
    usesReplacement: true,
    glyph: "a",
    left: 400,
  });
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(1);
});

test("includes the matched text container in glyph clipping bounds", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("div");
    target.id = "clipped-glyph";
    target.textContent = "o";
    target.style.cssText = [
      "position:fixed",
      "left:200px",
      "top:160px",
      "width:20px",
      "height:80px",
      "overflow:hidden",
      "text-indent:-15px",
      "font:64px Georgia",
    ].join(";");
    document.body.append(target);
  });
  await configure(page, { maxEyes: 1, duration: 700, frequency: 0, selector: "#clipped-glyph" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(false);
});

test("does not reveal glyphs in fully transparent content", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const wrapper = document.createElement("div");
    wrapper.style.opacity = "0";
    const target = document.createElement("div");
    target.id = "transparent-glyph";
    target.textContent = "o";
    target.style.cssText = "position:fixed;left:240px;top:160px;font:64px Georgia";
    wrapper.append(target);
    document.body.append(wrapper);
  });
  await configure(page, { maxEyes: 1, duration: 700, frequency: 0, selector: "#transparent-glyph" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(false);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
});

test("samples the glyph produced by text-transform", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    globalThis.sampledGlyphs = [];
    CanvasRenderingContext2D.prototype.fillText = function sampleText(text, ...args) {
      globalThis.sampledGlyphs.push(text);
      return fillText.call(this, text, ...args);
    };
    const target = document.createElement("div");
    target.id = "transformed-glyph";
    target.textContent = "o";
    target.style.cssText = [
      "position:fixed",
      "left:240px",
      "top:160px",
      "text-transform:uppercase",
      "font:64px Georgia",
    ].join(";");
    document.body.append(target);
  });
  await configure(page, { maxEyes: 1, duration: 700, frequency: 0, selector: "#transformed-glyph" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);
  expect(await page.evaluate(() => globalThis.sampledGlyphs)).toContain("O");
  expect(await page.evaluate(() => globalThis.sampledGlyphs)).not.toContain("o");
});

test("validates public configuration", async ({ page }) => {
  await openExample(page);
  const messages = await page.evaluate(() => [
    { maxEyes: 0 },
    { maxEyes: 9 },
    { duration: 499 },
    { frequency: 249 },
    { frequency: { min: 1000, max: 500 } },
    { excludeSelector: "" },
    { excludeSelector: "[" },
    { selector: "" },
    { selector: "[" },
  ].map(options => {
    try {
      new globalThis.DocumentLooksBack(options);
      return null;
    } catch (error) {
      return error.message;
    }
  }));
  expect(messages).toEqual([
    "maxEyes must be an integer from 1 through 8.",
    "maxEyes must be an integer from 1 through 8.",
    "duration must be a finite number greater than or equal to 500.",
    "frequency must be a finite number greater than or equal to 250.",
    "frequency.max must be a finite number greater than or equal to 1000.",
    "excludeSelector must be a non-empty CSS selector, false, or null.",
    "excludeSelector must be a valid CSS selector.",
    "selector must be a non-empty CSS selector or null.",
    "selector must be a valid CSS selector.",
  ]);
});

test("limits candidates to the configured selector", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    globalThis.documentLooksBack.destroy();
    document.querySelectorAll("[data-document-looks-back]").forEach((element) => {
      element.removeAttribute("data-document-looks-back");
    });
    const paragraphs = document.querySelectorAll("article p");
    paragraphs[0].id = "excluded-text";
    paragraphs[1].id = "selected-text";
    globalThis.documentLooksBack = new globalThis.DocumentLooksBack({
      duration: 700,
      frequency: 0,
      selector: "#selected-text",
    }).mount();
  });

  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(1);
});

test("excludes protected technical and interactive descendants by default", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("p");
    target.id = "protected-text";
    target.style.cssText = "position:fixed;left:240px;top:160px;font-size:32px";
    target.innerHTML = "<code>observer</code><a href='#'>page</a>";
    document.body.append(target);
  });
  await configure(page, { duration: 700, frequency: 0, selector: "#protected-text" });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(false);
});

test("supports a custom exclusion selector", async ({ page }) => {
  await openExample(page);
  await page.evaluate(() => {
    const target = document.createElement("p");
    target.id = "partly-protected-text";
    target.style.cssText = "position:fixed;left:240px;top:160px;font-size:32px";
    target.innerHTML = "<span class='no-eyes'>observer</span> <span id='allowed-glyph'>observer</span>";
    document.body.append(target);
  });
  await configure(page, {
    duration: 700,
    excludeSelector: ".no-eyes",
    frequency: 0,
    selector: "#partly-protected-text",
  });
  expect(await page.evaluate(() => globalThis.documentLooksBack.summon())).toBe(true);
  expect(await page.evaluate(() => {
    const canvas = document.querySelector(".document-looks-back-witness").getBoundingClientRect();
    const allowed = document.querySelector("#allowed-glyph").getBoundingClientRect();
    const center = canvas.left + canvas.width / 2;
    return center >= allowed.left && center <= allowed.right;
  })).toBe(true);
});

test("requires one mounted controller and ignores nested duplicate hooks", async ({ page }) => {
  await openExample(page);
  await configure(page, { maxEyes: 2, duration: 700, frequency: 0 });
  const result = await page.evaluate(() => {
    const article = document.querySelector("article");
    article.dataset.documentLooksBack = "";
    const nested = article.querySelector("p");
    nested.dataset.documentLooksBack = "";
    let duplicateError = null;
    try {
      new globalThis.DocumentLooksBack({ frequency: 0 }).mount();
    } catch (error) {
      duplicateError = error.message;
    }
    return {
      duplicateError,
      first: globalThis.documentLooksBack.summon(),
      second: globalThis.documentLooksBack.summon(),
    };
  });
  expect(result).toEqual({
    duplicateError: "Only one DocumentLooksBack controller may be mounted in a document.",
    first: true,
    second: true,
  });
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(2);
});
