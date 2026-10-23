"use strict";

const DATA_URL = "../benchmarks/results/dashboard-data.json";

const COLORS = {
  vanilla: "#f3c969",
  react: "#62d6f6",
  text: "#edf2ff",
  muted: "#9baac5",
  grid: "rgba(155, 170, 197, 0.15)",
};

const chartInstances = [];

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

function updateSummaryCards(data) {
  const pageLoad = getMetric(data, "pageLoad");

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
            return `${context.dataset.label}: ${formatNumber(context.parsed.y)} ${unit}`;
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

function createComparisonChart(canvasId, labels, vanilla, react, unit) {
  const canvas = getElement(canvasId);

  const chart = new Chart(canvas, {
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

  chartInstances.push(chart);
}

function renderPerformanceCharts(data) {
  const loadingKeys = [
    "pageLoad",
    "domContentLoaded",
    "renderCompletion",
  ];

  const loadingLabels = [
    "Page Load",
    "DOM Ready",
    "Render Completion",
  ];

  createComparisonChart(
    "load-chart",
    loadingLabels,
    loadingKeys.map((key) => getMetric(data, key).vanilla.mean),
    loadingKeys.map((key) => getMetric(data, key).react.mean),
    "ms"
  );

  const searchKeys = ["coldSearch", "cachedSearch"];

  createComparisonChart(
    "search-chart",
    ["Cold Search", "Repeated Search"],
    searchKeys.map((key) => getMetric(data, key).vanilla.mean),
    searchKeys.map((key) => getMetric(data, key).react.mean),
    "ms"
  );
}

function renderBundleCharts(data) {
  createComparisonChart(
    "bundle-chart",
    ["Uncompressed", "Gzip"],
    [data.bundle.vanilla.rawKB, data.bundle.vanilla.gzipKB],
    [data.bundle.react.rawKB, data.bundle.react.gzipKB],
    "KB"
  );

  const bytesToKB = (bytes) => Number((bytes / 1024).toFixed(2));

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

function renderStatisticsTable(data) {
  const rows = [
    ["Page Load", "pageLoad"],
    ["DOM Content Loaded", "domContentLoaded"],
    ["Cold Search", "coldSearch"],
    ["Repeated Search", "cachedSearch"],
    ["Render Completion", "renderCompletion"],
    ["Cache Improvement", "cacheImprovement"],
  ];

  const tbody = getElement("metrics-table");
  tbody.replaceChildren();

  for (const [label, key] of rows) {
    const metric = getMetric(data, key);
    const row = document.createElement("tr");

    const suffix = metric.unit === "%" ? "%" : ` ${metric.unit}`;

    row.append(
      createCell(label),
      createCell(`${formatNumber(metric.vanilla.mean)}${suffix}`),
      createCell(`${formatNumber(metric.react.mean)}${suffix}`),
      createCell(`${formatNumber(metric.vanilla.standardDeviation)}${suffix}`),
      createCell(`${formatNumber(metric.react.standardDeviation)}${suffix}`)
    );

    tbody.appendChild(row);
  }
}

function renderMethodology(data) {
  const methodology = data.methodology;

  if (!methodology) {
    return;
  }

  getElement("run-counts").textContent =
    `Runs per application: ` +
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
}

async function initializeDashboard() {
  const status = getElement("data-status");

  try {
    status.textContent = "Loading benchmark data…";

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

    updateSummaryCards(data);
    renderPerformanceCharts(data);
    renderBundleCharts(data);
    renderStatisticsTable(data);
    renderMethodology(data);

    status.textContent = "Benchmark data loaded";
    status.style.color = "#82dfb1";

    console.log("Dashboard initialized successfully.");
    console.log("Benchmark data:", data);
  } catch (error) {
    console.error("Dashboard initialization failed:", error);

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

document.addEventListener("DOMContentLoaded", initializeDashboard);