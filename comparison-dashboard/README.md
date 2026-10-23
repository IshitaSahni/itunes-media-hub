# Vanilla JavaScript vs React — Comparison Dashboard

## Project Overview

This dashboard is part of the **iTunes All-In-One Media Hub** group project.

The project compares two implementations of the same media discovery application:

1. Vanilla JavaScript
2. React

Both applications use the iTunes Search API to retrieve and display media results.

The comparison dashboard presents benchmark measurements collected using Playwright and Chromium, allowing users to examine application performance, search behaviour, rendering time, and application size.

---

## Dashboard Features

### 1. Performance Summary

The dashboard displays four key measurements:

- Vanilla JavaScript average page-load time
- React average page-load time
- Vanilla JavaScript compressed application size
- React compressed application size

The page-load summary cards display mean values.

### 2. Loading and Rendering Comparison

A grouped bar chart compares:

- Page-load duration
- DOM Content Loaded duration
- Controlled render-completion duration

Measurements are displayed in milliseconds.

### 3. Search Performance Comparison

A grouped bar chart compares:

- Cold search
- Repeated search

Cold search involves retrieving search results under the benchmark's test conditions.

Repeated search measures a subsequent search that can benefit from application caching.

Search durations are displayed in milliseconds.

### 4. Interactive Mean and Median Selection

Users can switch between:

- **Mean:** Arithmetic average of the observed benchmark runs.
- **Median:** Middle value of the observed benchmark runs.

Changing the selection updates:

- Loading and rendering chart
- Search performance chart
- Detailed statistics table

The bundle-size charts and summary cards remain unchanged.

### 5. Detailed Statistics Table

The statistics table displays:

- Selected mean or median for Vanilla JavaScript
- Selected mean or median for React
- Vanilla JavaScript standard deviation
- React standard deviation

Standard deviation measures the variability of observed results.

### 6. Bundle Size Comparison

The dashboard compares the measured HTML, CSS, and JavaScript files using:

- Uncompressed file sizes
- Gzip-compressed file sizes
- JavaScript, CSS, and HTML asset breakdown

Sizes are displayed in KB, where 1 KB = 1024 bytes.

### 7. Application Launch Links

The dashboard includes links to open both implementations.

Default local addresses:

- Vanilla JavaScript: http://127.0.0.1:5500
- React: http://127.0.0.1:4173

These links require the corresponding local servers to be running.

---

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js
- Playwright
- Chromium
- JSON benchmark data
- Node.js and npm for local development servers

The comparison dashboard itself does not require React.

---

## Project Structure

```text
itunes-media-hub/
├── vanilla-app/
├── react-app/
├── benchmarks/
│   └── results/
│       ├── baseline-benchmark.json
│       ├── search-benchmark.json
│       ├── render-benchmark.json
│       ├── render-fixture.json
│       ├── bundle-benchmark.json
│       └── dashboard-data.json
└── comparison-dashboard/
    ├── index.html
    ├── style.css
    ├── app.js
    └── README.md
```

The dashboard reads benchmark results from:

`benchmarks/results/dashboard-data.json`

---

## Prerequisites

Install:

- Node.js
- npm
- A modern web browser
- An internet connection for loading Chart.js from its CDN

The React application also requires its project dependencies.

---

## Running the Comparison Dashboard

### Step 1 — Open the repository

Open the `itunes-media-hub` folder in VS Code.

Open a PowerShell terminal at the repository root.

### Step 2 — Start the dashboard server

Run:

```powershell
npx.cmd --yes http-server . -a 127.0.0.1 -p 8080 -c-1
```

### Step 3 — Open the dashboard

Visit:

http://127.0.0.1:8080/comparison-dashboard/

The dashboard must be served from the repository root because its JavaScript loads the benchmark JSON using a relative path.

Do not open `index.html` directly using the `file://` protocol.

---

## Running the Vanilla JavaScript Application

Open another terminal at the repository root.

Run:

```powershell
npx.cmd --yes http-server ./vanilla-app -a 127.0.0.1 -p 5500 -c-1
```

Open:

http://127.0.0.1:5500

---

## Running the React Application

Open another terminal at the repository root.

Move into the React application folder:

```powershell
cd react-app
```

Install dependencies if they are not already installed:

```powershell
npm.cmd install
```

Build the production application:

```powershell
npm.cmd run build
```

Start the production preview:

```powershell
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open:

http://127.0.0.1:4173

---

## Benchmark Methodology

Benchmark measurements were collected by the benchmarking team using Playwright and Chromium.

The consolidated dashboard dataset records:

- 5 baseline runs per application
- 10 search runs per application
- 10 controlled rendering runs per application

The search benchmark uses the query:

`Arijit Singh`

The controlled rendering fixture contains 29 results.

For repeated-run measurements, the dataset includes:

- Mean
- Median
- Minimum
- Maximum
- Population standard deviation
- Observation count

The dashboard displays selected statistics from the consolidated JSON data.

The dashboard does not execute new benchmarks when opened.

For the original benchmarking scripts and methodology, refer to:

`benchmarks/README.md`

---

## Interpretation and Limitations

### Network Variability

Cold-search measurements involve live API requests and may be affected by network conditions and response times.

The two applications may use different API request parameters, limiting direct comparability of cold-search timings.

### Small Timing Differences

Small differences in measured times should not be interpreted as definitive proof that one framework is inherently faster.

### Rendering Measurement

The controlled rendering benchmark uses a shared fixture.

The measured duration reflects the benchmark's render-completion procedure and should not be interpreted as isolated framework execution time.

### Bundle Size

The Vanilla JavaScript measurement uses application source files, while the React measurement uses its production build.

These represent different packaging approaches.

Gzip sizes are calculated compressed file sizes, not actual network transfer measurements.

SVG files are excluded from the reported HTML, CSS, and JavaScript bundle totals.

### Benchmark Environment

Results reflect the environment and conditions under which the benchmark runs were collected.

Performance may differ across devices, browsers, and networks.

---

## Troubleshooting

### Dashboard shows "Unable to load benchmark data"

Check that:

1. The dashboard server was started from the repository root.
2. `benchmarks/results/dashboard-data.json` exists.
3. The dashboard URL includes `/comparison-dashboard/`.

### Charts are missing

Check your internet connection because Chart.js is loaded from a CDN.

Open the browser developer console to inspect any errors.

### React application does not open

Ensure that the React production build exists and the Vite preview server is running on port 4173.

### Vanilla JavaScript application does not open

Ensure that the Vanilla application server is running on port 5500.

### Mean/Median selector does not update

Check that the benchmark JSON loaded successfully and that `app.js` is not reporting errors in the browser console.

---

## Project Conclusion

This dashboard provides a structured comparison of Vanilla JavaScript and React implementations of the same iTunes media discovery application.

It highlights differences in measured performance, search behaviour, rendering, and application footprint while acknowledging the limitations of the benchmarking methodology.

The objective is to support evidence-based evaluation rather than declare a universally superior implementation.