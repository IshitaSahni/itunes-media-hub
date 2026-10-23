const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const APPS = {
  vanilla: "http://127.0.0.1:5500",
  react: "http://127.0.0.1:4173",
};

const RUNS = 10;
const QUERY = "Arijit Singh";
const RESULTS_DIR = path.join(__dirname, "../results");
const FIXTURE_PATH = path.join(
  RESULTS_DIR,
  "render-fixture.json"
);

function isSearchRequest(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "itunes.apple.com" &&
      parsed.pathname === "/search"
    );
  } catch {
    return false;
  }
}

async function createFixture(browser) {
  if (fs.existsSync(FIXTURE_PATH)) {
    return JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf8"));
  }

  console.log("Capturing one iTunes API response...");

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const responsePromise = page.waitForResponse(
      response =>
        isSearchRequest(response.url()) &&
        response.status() === 200,
      { timeout: 30000 }
    );

    await page.goto(APPS.vanilla, {
      waitUntil: "load",
    });

    await page.locator("#search-input").fill(QUERY);
    await page.locator("#search-btn").click();

    const response = await responsePromise;
    const data = await response.json();

    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error("iTunes response contains no results.");
    }

    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(
      FIXTURE_PATH,
      JSON.stringify(data, null, 2)
    );

    console.log(
      `Fixture saved with ${data.results.length} results.`
    );

    return data;
  } finally {
    await context.close();
  }
}

async function benchmarkApp(browser, name, url, fixture) {
  const results = [];

  for (let run = 1; run <= RUNS; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    let responseReleasedAt = null;
    let interceptedRequests = 0;

    try {
      await page.route("**/*", async route => {
        if (!isSearchRequest(route.request().url())) {
          return route.continue();
        }

        interceptedRequests++;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
          },
          body: JSON.stringify(fixture),
        });

        responseReleasedAt = performance.now();
      });

      await page.goto(url, {
        waitUntil: "load",
        timeout: 30000,
      });

      await page.locator("#search-input").fill(QUERY);
      await page.locator("#search-btn").click();

      await page.waitForFunction(
        expectedCount =>
          document.querySelectorAll(
            "#media-grid .media-card"
          ).length === expectedCount,
        fixture.results.length,
        { timeout: 30000 }
      );

      // Wait for the browser to reach a subsequent frame.
      await page.evaluate(
        () =>
          new Promise(resolve =>
            requestAnimationFrame(() =>
              requestAnimationFrame(resolve)
            )
          )
      );

      const completedAt = performance.now();

      const cardCount = await page.locator(
        "#media-grid .media-card"
      ).count();

      if (interceptedRequests !== 1) {
        throw new Error(
          `Expected 1 API request, got ${interceptedRequests}`
        );
      }

      results.push({
        app: name,
        run,
        renderCompletionMs: Number(
          (completedAt - responseReleasedAt).toFixed(2)
        ),
        cardCount,
        interceptedRequests,
      });

      console.log(
        `${name} | Run ${run}/${RUNS} completed`
      );
    } catch (error) {
      console.error(
        `${name} | Run ${run} failed: ${error.message}`
      );

      results.push({
        app: name,
        run,
        error: error.message,
      });
    } finally {
      await context.close();
    }
  }

  return results;
}

function average(values) {
  if (!values.length) return null;

  return Number(
    (
      values.reduce((a, b) => a + b, 0) /
      values.length
    ).toFixed(2)
  );
}

async function main() {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
  });

  const allResults = [];

  try {
    const fixture = await createFixture(browser);

    console.log(
      `\nUsing identical fixture: ${fixture.results.length} results`
    );

    for (const [name, url] of Object.entries(APPS)) {
      console.log(`\nBenchmarking ${name} rendering...`);

      const results = await benchmarkApp(
        browser,
        name,
        url,
        fixture
      );

      allResults.push(...results);
    }
  } finally {
    await browser.close();
  }

  const summary = {};

  for (const name of Object.keys(APPS)) {
    const valid = allResults.filter(
      result => result.app === name && !result.error
    );

    summary[name] = {
      successfulRuns: valid.length,
      averageRenderCompletionMs: average(
        valid.map(result => result.renderCompletionMs)
      ),
      averageCardCount: average(
        valid.map(result => result.cardCount)
      ),
    };
  }

  const outputPath = path.join(
    RESULTS_DIR,
    "render-benchmark.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        runsPerApp: RUNS,
        fixtureResultCount:
          allResults.find(result => !result.error)?.cardCount ??
          null,
        rawResults: allResults,
        summary,
      },
      null,
      2
    )
  );

  console.log("\nRendering benchmark summary:");
  console.table(summary);

  console.log(`\nResults saved to ${outputPath}`);

  if (allResults.some(result => result.error)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});