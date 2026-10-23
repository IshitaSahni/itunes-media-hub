const fs = require("fs");
const path = require("path");

const RESULTS_DIR = path.resolve(__dirname, "../results");

const INPUT_FILES = {
  baseline: "baseline-benchmark.json",
  search: "search-benchmark.json",
  rendering: "render-benchmark.json",
  bundle: "bundle-benchmark.json",
};

const APPS = ["vanilla", "react"];

function readJSON(filename) {
  const filePath = path.join(RESULTS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing benchmark file: ${filename}`);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function round(value) {
  return Number(value.toFixed(2));
}

function statistics(values) {
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.some(
      (value) => typeof value !== "number" ||
        !Number.isFinite(value)
    )
  ) {
    throw new Error("Invalid or empty measurement series");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;

  const mean = values.reduce((sum, value) => sum + value, 0) / count;

  const median = count % 2 === 0
    ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
    : sorted[Math.floor(count / 2)];

  const variance = values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0
  ) / count;

  return {
    count,
    mean: round(mean),
    median: round(median),
    min: round(sorted[0]),
    max: round(sorted[count - 1]),
    standardDeviation: round(Math.sqrt(variance)),
  };
}

function valuesFor(rows, app, getValue) {
  const selected = rows.filter((row) => row.app === app);

  if (!selected.length) {
    throw new Error(`No measurements for ${app}`);
  }

  return selected.map(getValue);
}

function metric(rows, getValue, unit, note) {
  return {
    unit,
    lowerIsBetter: true,
    note,
    vanilla: statistics(valuesFor(rows, "vanilla", getValue)),
    react: statistics(valuesFor(rows, "react", getValue)),
  };
}

function main() {
  const input = Object.fromEntries(
    Object.entries(INPUT_FILES).map(([key, filename]) => [
      key,
      readJSON(filename),
    ])
  );

  const baselineRows = input.baseline.rawResults;
  const searchRows = input.search.rawResults;
  const renderingRows = input.rendering.rawResults;

  const metrics = {
    pageLoad: metric(
      baselineRows,
      (row) => row.pageLoadTime,
      "ms",
      "Navigation timing measured across repeated browser runs."
    ),

    domContentLoaded: metric(
      baselineRows,
      (row) => row.domContentLoaded,
      "ms",
      "DOM Content Loaded navigation timing."
    ),

    initialDomNodes: metric(
      baselineRows,
      (row) => row.domNodeCount,
      "nodes",
      "Initial DOM node count; fewer nodes are not automatically better."
    ),

    coldSearch: metric(
      searchRows,
      (row) => row.coldSearch.searchToDisplayTime,
      "ms",
      "Includes live API/network variability; not isolated framework speed."
    ),

    cachedSearch: metric(
      searchRows,
      (row) => row.cachedSearch.searchToDisplayTime,
      "ms",
      "Repeated query timing after earlier search in the same session."
    ),

    cacheImprovement: {
      unit: "%",
      lowerIsBetter: false,
      note: "Per-run reported percentage improvement.",
      vanilla: statistics(
        valuesFor(searchRows, "vanilla", (row) => row.cacheImprovement)
      ),
      react: statistics(
        valuesFor(searchRows, "react", (row) => row.cacheImprovement)
      ),
    },

    cachedSearchApiRequests: metric(
      searchRows,
      (row) => row.cachedSearch.apiRequests,
      "requests",
      "Observed iTunes search requests during the repeated query."
    ),

    renderCompletion: metric(
      renderingRows,
      (row) => row.renderCompletionMs,
      "ms",
      "Controlled fixture render-completion proxy, not pure framework render time."
    ),

    renderedCards: {
      unit: "cards",
      lowerIsBetter: null,
      note: "Result-card count used to verify comparable output.",
      vanilla: statistics(
        valuesFor(renderingRows, "vanilla", (row) => row.cardCount)
      ),
      react: statistics(
        valuesFor(renderingRows, "react", (row) => row.cardCount)
      ),
    },
  };

  const bundle = {};

  for (const app of APPS) {
    const totals = input.bundle.results[app].totals;

    bundle[app] = {
      fileCount: totals.fileCount,
      rawBytes: totals.rawBytes,
      gzipBytes: totals.gzipBytes,
      javascriptBytes: totals.javascriptBytes,
      cssBytes: totals.cssBytes,
      htmlBytes: totals.htmlBytes,
      rawKB: round(totals.rawBytes / 1024),
      gzipKB: round(totals.gzipBytes / 1024),
    };
  }

  const dashboard = {
    project: "Vanilla JavaScript vs React — iTunes Media Hub",
    generatedAt: new Date().toISOString(),
    apps: {
      vanilla: "Vanilla JavaScript",
      react: "React",
    },
    sourceFiles: INPUT_FILES,
    methodology: {
      baselineRunsPerApp: input.baseline.runsPerApp,
      searchRunsPerApp: input.search.runsPerApp,
      renderingRunsPerApp: input.rendering.runsPerApp,
      searchQuery: input.search.primaryQuery,
      renderingFixtureResultCount: input.rendering.fixtureResultCount,
      statistics:
        "Population standard deviation across observed benchmark runs.",
      limitations: [
        "Small benchmark samples; results are descriptive, not statistically conclusive.",
        "Browser and machine conditions can affect measured timings.",
        "Live search timing includes API response and network variability.",
        "The two applications use different live iTunes API query parameters.",
        "Render-completion timing includes response handling and animation frames.",
        "The reported JavaScript heap measurement was constant and is excluded because it was not informative.",
        "Bundle comparison uses Vanilla source files and the React production build.",
        "Bundle Gzip sizes are locally calculated, not actual network transfer measurements.",
        "Bundle analysis excludes SVGs, images and other non-HTML/CSS/JS assets.",
      ],
    },
    metrics,
    bundle,
  };

  const outputPath = path.join(
    RESULTS_DIR,
    "dashboard-data.json"
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(dashboard, null, 2)
  );

  console.log("\nFINAL PERFORMANCE COMPARISON\n");

  const rows = [
    ["Page load (ms)", "pageLoad"],
    ["DOM Content Loaded (ms)", "domContentLoaded"],
    ["Cold search (ms)", "coldSearch"],
    ["Cached search (ms)", "cachedSearch"],
    ["Render completion (ms)", "renderCompletion"],
    ["Cache improvement (%)", "cacheImprovement"],
  ];

  console.table(
    rows.map(([name, key]) => ({
      metric: name,
      vanilla: metrics[key].vanilla.mean,
      react: metrics[key].react.mean,
      vanillaStdDev: metrics[key].vanilla.standardDeviation,
      reactStdDev: metrics[key].react.standardDeviation,
    }))
  );

  console.log("\nBUNDLE COMPARISON\n");

  console.table({
    vanilla: {
      rawKB: bundle.vanilla.rawKB,
      gzipKB: bundle.vanilla.gzipKB,
    },
    react: {
      rawKB: bundle.react.rawKB,
      gzipKB: bundle.react.gzipKB,
    },
  });

  console.log("\nDashboard data saved to:");
  console.log(outputPath);
  console.log("\nAnalysis completed successfully.");
}

try {
  main();
} catch (error) {
  console.error(`Analysis failed: ${error.message}`);
  process.exitCode = 1;
}