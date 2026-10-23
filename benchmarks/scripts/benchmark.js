const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const BASE_URLS = {
  vanilla: "http://127.0.0.1:5500",
  react: "http://127.0.0.1:4173",
};

const RESULTS_DIR = path.join(__dirname, "../results");
const RUNS_PER_APP = 5;

async function benchmarkApp(browser, appName, url) {
  const results = [];

  for (let run = 1; run <= RUNS_PER_APP; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "load",
        timeout: 30000,
      });

      const metrics = await page.evaluate(() => {
        const navigation =
          performance.getEntriesByType("navigation")[0];

        return {
          pageLoadTime: navigation
            ? navigation.loadEventEnd - navigation.startTime
            : null,

          domContentLoaded: navigation
            ? navigation.domContentLoadedEventEnd -
              navigation.startTime
            : null,

          domNodeCount:
            document.querySelectorAll("*").length,

          jsHeapUsed:
            performance.memory?.usedJSHeapSize ?? null,
        };
      });

      results.push({
        app: appName,
        run,
        ...metrics,
      });

      console.log(
        `${appName} | Run ${run}/${RUNS_PER_APP} completed`
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

function calculateAverage(results, metric) {
  const values = results
    .map((result) => result[metric])
    .filter((value) => Number.isFinite(value));

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
    for (const [appName, url] of Object.entries(BASE_URLS)) {
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

  for (const appName of Object.keys(BASE_URLS)) {
    const appResults = allResults.filter(
      (result) => result.app === appName
    );

    summary[appName] = {
      pageLoadTime: calculateAverage(
        appResults,
        "pageLoadTime"
      ),
      domContentLoaded: calculateAverage(
        appResults,
        "domContentLoaded"
      ),
      domNodeCount: calculateAverage(
        appResults,
        "domNodeCount"
      ),
      jsHeapUsed: calculateAverage(
        appResults,
        "jsHeapUsed"
      ),
    };
  }

  const output = {
    timestamp: new Date().toISOString(),
    runsPerApp: RUNS_PER_APP,
    rawResults: allResults,
    summary,
  };

  const outputPath = path.join(
    RESULTS_DIR,
    "baseline-benchmark.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(output, null, 2)
  );

  console.log("\nBenchmark summary:");
  console.table(summary);

  console.log(`\nResults saved to ${outputPath}`);

  const failures = allResults.filter(
    (result) => result.error
  );

  if (failures.length > 0) {
    console.error(
      `\n${failures.length} benchmark runs failed.`
    );
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});