"use strict";

const DATA_URL = "../benchmarks/results/dashboard-data.json";

const COLORS = {
  vanilla: "#f3c969",
  react: "#62d6f6",
  text: "#edf2ff",
  muted: "#9baac5",
  grid: "rgba(155, 170, 197, 0.15)",
};

const chartInstances = new Map();

let dashboardData = null;
let selectedStatistic = "mean";

const STATISTICS_ROWS = [
  ["Page Load", "pageLoad"],
  ["DOM Content Loaded", "domContentLoaded"],
  ["Cold Search", "coldSearch"],
  ["Repeated Search", "cachedSearch"],
  ["Render Completion", "renderCompletion"],
  ["Cache Improvement", "cacheImprovement"],
];

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing dashboard element: ${id}`);
  }

  return element;
}

function formatNumber(value, decimals = 2) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "N/A";
  }

  return number.toFixed(decimals);
}

function getMetric(data, key) {
  const metric = data.metrics?.[key];

  if (!metric || !metric.vanilla || !metric.react) {
    throw new Error(`Missing benchmark metric: ${key}`);
  }

  return metric;
}

function metricValue(data, key, app, statistic = selectedStatistic) {
  const metric = getMetric(data, key);
  const value = Number(metric[app][statistic]);

  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid ${statistic} value for ${app}: ${key}`
    );
  }

  return value;
}

function updateSummaryCards(data) {
  const pageLoad = getMetric(data, "pageLoad");

  // Summary cards deliberately show means regardless
  // of the interactive selector.
  getElement("vanilla-load").textContent =
    `${formatNumber(pageLoad.vanilla.mean)} ms`;

  getElement("react-load").textContent =
    `${formatNumber(pageLoad.react.mean)} ms`;

  getElement("vanilla-gzip").textContent =
    `${formatNumber(data.bundle.vanilla.gzipKB)} KB`;

  getElement("react-gzip").textContent =
    `${formatNumber(data.bundle.react.gzipKB)} KB`;
}

function chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: COLORS.text,
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          label(context) {
            return (
              `${context.dataset.label}: ` +
              `${formatNumber(context.parsed.y)} ${unit}`
            );
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: COLORS.muted,
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: COLORS.muted,
        },
        grid: {
          color: COLORS.grid,
        },
        title: {
          display: true,
          text: unit,
          color: COLORS.muted,
        },
      },
    },
  };
}

function createComparisonChart(
  canvasId,
  labels,
  vanilla,
  react,
  unit
) {
  const existingChart = chartInstances.get(canvasId);

  if (existingChart) {
    existingChart.destroy();
  }

  const chart = new Chart(getElement(canvasId), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Vanilla JavaScript",
          data: vanilla,
          backgroundColor: COLORS.vanilla,
          borderRadius: 6,
          maxBarThickness: 56,
        },
        {
          label: "React",
          data: react,
          backgroundColor: COLORS.react,
          borderRadius: 6,
          maxBarThickness: 56,
        },
      ],
    },
    options: chartOptions(unit),
  });

  chartInstances.set(canvasId, chart);
}

function renderPerformanceCharts(data) {
  const loadingKeys = [
    "pageLoad",
    "domContentLoaded",
    "renderCompletion",
  ];

  createComparisonChart(
    "load-chart",
    ["Page Load", "DOM Ready", "Render Completion"],
    loadingKeys.map((key) =>
      metricValue(data, key, "vanilla")
    ),
    loadingKeys.map((key) =>
      metricValue(data, key, "react")
    ),
    "ms"
  );

  const searchKeys = [
    "coldSearch",
    "cachedSearch",
  ];

  createComparisonChart(
    "search-chart",
    ["Cold Search", "Repeated Search"],
    searchKeys.map((key) =>
      metricValue(data, key, "vanilla")
    ),
    searchKeys.map((key) =>
      metricValue(data, key, "react")
    ),
    "ms"
  );
}

function renderBundleCharts(data) {
  createComparisonChart(
    "bundle-chart",
    ["Uncompressed", "Gzip"],
    [
      data.bundle.vanilla.rawKB,
      data.bundle.vanilla.gzipKB,
    ],
    [
      data.bundle.react.rawKB,
      data.bundle.react.gzipKB,
    ],
    "KB"
  );

  const bytesToKB = (bytes) =>
    Number((Number(bytes) / 1024).toFixed(2));

  createComparisonChart(
    "assets-chart",
    ["JavaScript", "CSS", "HTML"],
    [
      bytesToKB(data.bundle.vanilla.javascriptBytes),
      bytesToKB(data.bundle.vanilla.cssBytes),
      bytesToKB(data.bundle.vanilla.htmlBytes),
    ],
    [
      bytesToKB(data.bundle.react.javascriptBytes),
      bytesToKB(data.bundle.react.cssBytes),
      bytesToKB(data.bundle.react.htmlBytes),
    ],
    "KB"
  );
}

function createCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  return cell;
}

function formatMetricValue(value, unit) {
  const suffix = unit === "%" ? "%" : ` ${unit}`;
  return `${formatNumber(value)}${suffix}`;
}

function renderStatisticsTable(data) {
  const tbody = getElement("metrics-table");
  tbody.replaceChildren();

  for (const [label, key] of STATISTICS_ROWS) {
    const metric = getMetric(data, key);
    const row = document.createElement("tr");

    row.append(
      createCell(label),
      createCell(
        formatMetricValue(
          metricValue(data, key, "vanilla"),
          metric.unit
        )
      ),
      createCell(
        formatMetricValue(
          metricValue(data, key, "react"),
          metric.unit
        )
      ),
      createCell(
        formatMetricValue(
          metric.vanilla.standardDeviation,
          metric.unit
        )
      ),
      createCell(
        formatMetricValue(
          metric.react.standardDeviation,
          metric.unit
        )
      )
    );

    tbody.appendChild(row);
  }
}

function updateStatisticLabels() {
  const isMedian = selectedStatistic === "median";
  const label = isMedian ? "Median" : "Mean";

  getElement("statistic-description").textContent =
    isMedian
      ? "Median: the middle value of the observed runs, less sensitive to unusually slow measurements."
      : "Mean: the arithmetic average of all observed runs.";

  getElement("loading-chart-description").textContent =
    `${label} duration in milliseconds`;

  getElement("search-chart-description").textContent =
    `${label} cold and repeated search duration`;

  getElement("table-description").textContent =
    `${label} values alongside standard deviations`;

  getElement("vanilla-stat-heading").textContent =
    `Vanilla JS ${label}`;

  getElement("react-stat-heading").textContent =
    `React ${label}`;

  document
    .querySelectorAll("[data-statistic]")
    .forEach((button) => {
      const isActive =
        button.dataset.statistic === selectedStatistic;

      button.classList.toggle("active", isActive);

      button.setAttribute(
        "aria-pressed",
        String(isActive)
      );
    });
}

function setStatistic(statistic) {
  if (!["mean", "median"].includes(statistic)) {
    return;
  }

  if (!dashboardData) {
    return;
  }

  selectedStatistic = statistic;

  updateStatisticLabels();
  renderPerformanceCharts(dashboardData);
  renderStatisticsTable(dashboardData);
}

function initializeStatisticSelector() {
  document
    .querySelectorAll("[data-statistic]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        setStatistic(button.dataset.statistic);
      });
    });

  updateStatisticLabels();
}

function renderMethodology(data) {
  const methodology = data.methodology;

  if (!methodology) {
    return;
  }

  getElement("run-counts").textContent =
    "Runs per application: " +
    `${methodology.baselineRunsPerApp} baseline, ` +
    `${methodology.searchRunsPerApp} search, ` +
    `${methodology.renderingRunsPerApp} rendering.`;
}

function validateData(data) {
  if (!data || !data.metrics || !data.bundle) {
    throw new Error("Invalid dashboard benchmark data");
  }

  for (const app of ["vanilla", "react"]) {
    if (!data.bundle[app]) {
      throw new Error(`Missing bundle data for ${app}`);
    }
  }

  const requiredMetrics = [
    ...new Set(STATISTICS_ROWS.map((row) => row[1])),
  ];

  for (const key of requiredMetrics) {
    for (const app of ["vanilla", "react"]) {
      for (const statistic of ["mean", "median"]) {
        const value = Number(
          getMetric(data, key)[app][statistic]
        );

        if (!Number.isFinite(value)) {
          throw new Error(
            `Missing ${statistic} for ${app}: ${key}`
          );
        }
      }
    }
  }
}

async function initializeDashboard() {
  const status = getElement("data-status");

  try {
    status.textContent = "Loading benchmark data…";

    initializeStatisticSelector();

    const response = await fetch(DATA_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Could not load benchmark data (HTTP ${response.status})`
      );
    }

    const data = await response.json();

    validateData(data);

    if (typeof Chart === "undefined") {
      throw new Error(
        "Chart.js could not load. Check your internet connection."
      );
    }

    dashboardData = data;

    updateSummaryCards(data);
    renderPerformanceCharts(data);
    renderBundleCharts(data);
    renderStatisticsTable(data);
    renderMethodology(data);
    updateStatisticLabels();

    status.textContent = "Benchmark data loaded";
    status.style.color = "#82dfb1";

    console.log("Dashboard initialized successfully.");
    console.log("Benchmark data:", data);
  } catch (error) {
    console.error(
      "Dashboard initialization failed:",
      error
    );

    status.textContent = "Unable to load benchmark data";
    status.style.color = "#ff9a9a";

    const tbody = document.getElementById("metrics-table");

    if (tbody) {
      tbody.replaceChildren();

      const row = document.createElement("tr");
      const cell = document.createElement("td");

      cell.colSpan = 5;
      cell.textContent = error.message;

      row.appendChild(cell);
      tbody.appendChild(row);
    }
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initializeDashboard
);