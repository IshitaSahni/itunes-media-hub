const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

const APPS = {
  vanilla: "http://127.0.0.1:5500",
  react: "http://127.0.0.1:4173",
};

const RUNS = 10;
const PRIMARY_QUERY = "Arijit Singh";
const SECONDARY_QUERY = "Taylor Swift";

const RESULTS_DIR = path.join(__dirname, "../results");

async function performSearch(page, query) {
  const input = page.locator("#search-input");
  const button = page.locator("#search-btn");

  // Clear the previous query and enter the new one.
  await input.fill(query);

  const startTime = performance.now();

  await button.click();

  // Wait for the grid to contain real media cards
  // corresponding to the requested query.
  await page.waitForFunction(
    (expectedQuery) => {
      const cards = document.querySelectorAll(
        "#media-grid .media-card"
      );

      if (cards.length === 0) return false;

      const gridText = [...cards]
        .map(card => card.textContent.toLowerCase())
        .join(" ");

      return gridText.includes(expectedQuery.toLowerCase());
    },
    query,
    { timeout: 30000 }
  );

  const endTime = performance.now();

  const resultData = await page.evaluate(() => {
    const grid = document.querySelector("#media-grid");

    return {
      resultsDisplayed: grid.querySelectorAll(
        ".media-card"
      ).length,
      domNodeCount: grid.querySelectorAll("*").length,
    };
  });

  return {
    searchToDisplayTime: Number(
      (endTime - startTime).toFixed(2)
    ),
    ...resultData,
  };
}

async function benchmarkApp(browser, appName, url) {
  const results = [];

  for (let run = 1; run <= RUNS; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "load",
        timeout: 30000,
      });

      // First search: no cached results in this context.
      const coldSearch = await performSearch(
        page,
        PRIMARY_QUERY
      );

      // Search for something different before returning
      // to the original query.
      await performSearch(page, SECONDARY_QUERY);

      // Repeat the original query to test cached results.
// Track iTunes API requests during the repeated search.
let repeatSearchApiRequests = 0;

const trackRequest = (request) => {
  if (
    request.url().includes("itunes.apple.com/search")
  ) {
    repeatSearchApiRequests++;
  }
};

page.on("request", trackRequest);

// Repeat the original query.
const cachedSearch = await performSearch(
  page,
  PRIMARY_QUERY
);

// Allow any delayed/debounced request to become visible.
await page.waitForTimeout(750);

page.off("request", trackRequest);

cachedSearch.apiRequests = repeatSearchApiRequests;
      const cacheImprovement =
        coldSearch.searchToDisplayTime > 0
          ? Number(
              (
                ((coldSearch.searchToDisplayTime -
                  cachedSearch.searchToDisplayTime) /
                  coldSearch.searchToDisplayTime) *
                100
              ).toFixed(2)
            )
          : null;

      results.push({
        app: appName,
        run,
        query: PRIMARY_QUERY,
        coldSearch,
        cachedSearch,
        cacheImprovement,
      });

      console.log(
        `${appName} | Run ${run}/${RUNS} completed`
      );
    } catch (error) {
      console.error(
        `${appName} | Run ${run} failed: ${error.message}`
      );

      results.push({
        app: appName,
        run,
        error: error.message,
      });
    } finally {
      await context.close();
    }
  }

  return results;
}

function average(results, selector) {
  const values = results
    .filter(result => !result.error)
    .map(selector)
    .filter(Number.isFinite);

  if (values.length === 0) return null;

  return Number(
    (
      values.reduce((sum, value) => sum + value, 0) /
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
    for (const [appName, url] of Object.entries(APPS)) {
      console.log(`\nBenchmarking ${appName}...`);

      const results = await benchmarkApp(
        browser,
        appName,
        url
      );

      allResults.push(...results);
    }
  } finally {
    await browser.close();
  }

  const summary = {};

  for (const appName of Object.keys(APPS)) {
    const appResults = allResults.filter(
      result => result.app === appName
    );

    summary[appName] = {
      coldSearchTime: average(
        appResults,
        r => r.coldSearch.searchToDisplayTime
      ),
      cachedSearchTime: average(
        appResults,
        r => r.cachedSearch.searchToDisplayTime
      ),
      resultsDisplayed: average(
        appResults,
        r => r.coldSearch.resultsDisplayed
      ),
      domNodeCount: average(
        appResults,
        r => r.coldSearch.domNodeCount
      ),
      cacheImprovement: average(
        appResults,
        r => r.cacheImprovement
      ),
    };
  }

  const output = {
    timestamp: new Date().toISOString(),
    primaryQuery: PRIMARY_QUERY,
    secondaryQuery: SECONDARY_QUERY,
    runsPerApp: RUNS,
    rawResults: allResults,
    summary,
  };

  const outputPath = path.join(
    RESULTS_DIR,
    "search-benchmark.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(output, null, 2)
  );

  console.log("\nSearch benchmark summary:");
  console.table(summary);

  console.log(`\nResults saved to ${outputPath}`);

  const failures = allResults.filter(
    result => result.error
  );

  if (failures.length > 0) {
    console.error(
      `\n${failures.length} benchmark runs failed.`
    );
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});