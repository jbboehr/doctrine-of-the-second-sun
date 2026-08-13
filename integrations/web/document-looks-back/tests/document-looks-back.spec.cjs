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

test("enforces maxEyes and restores source glyphs after duration", async ({ page }) => {
  const diagnostics = await openExample(page);
  await configure(page, { maxEyes: 2, duration: 700, frequency: 0 });
  expect(await page.evaluate(() => [
    globalThis.documentLooksBack.summon(),
    globalThis.documentLooksBack.summon(),
    globalThis.documentLooksBack.summon(),
  ])).toEqual([true, true, false]);
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(2);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(2);
  expect(await page.evaluate(() => CSS.highlights.get("document-looks-back-glyph").size)).toBe(2);

  await page.waitForTimeout(800);
  await expect(page.locator(".document-looks-back-witness")).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.documentLooksBack.activeCount)).toBe(0);
  expect(await page.evaluate(() => CSS.highlights.get("document-looks-back-glyph").size)).toBe(0);
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
  const selectedParent = await page.evaluate(() => {
    const ranges = [...CSS.highlights.get("document-looks-back-glyph")];
    return ranges[0]?.startContainer.parentElement.id;
  });
  expect(selectedParent).toBe("selected-text");
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
    const ranges = [...CSS.highlights.get("document-looks-back-glyph")];
    return ranges[0]?.startContainer.parentElement.id;
  })).toBe("allowed-glyph");
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
