const os = require("node:os");
const path = require("node:path");
const { defineConfig } = require("@playwright/test");

const integrationRoot = process.env.HELIOGENESIS_INTEGRATION_ROOT
  || path.resolve(__dirname, "..");
const chromiumPath = process.env.HELIOGENESIS_CHROMIUM_PATH;
const baseURL = "http://127.0.0.1:4173";

if (!chromiumPath) {
  throw new Error("HELIOGENESIS_CHROMIUM_PATH must identify the Nix-provided Chromium executable.");
}

module.exports = defineConfig({
  testDir: __dirname,
  outputDir: path.join(os.tmpdir(), "heliogenesis-playwright-results"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["line"], ["github"]] : "line",
  timeout: 20_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `miniserve --quiet --port 4173 ${JSON.stringify(integrationRoot)}`,
    url: `${baseURL}/example/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
  projects: [
    {
      name: "chromium-webgl",
      testMatch: "heliogenesis.spec.cjs",
      use: {
        browserName: "chromium",
        launchOptions: {
          executablePath: chromiumPath,
          args: [
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
            "--use-gl=swiftshader",
          ],
        },
      },
    },
    {
      name: "firefox-fallback",
      testMatch: "failure.spec.cjs",
      use: {
        browserName: "firefox",
      },
    },
  ],
});
