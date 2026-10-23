function BenchmarkDrawer({ isOpen, onClose, metrics }) {
  if (!isOpen) {
    return null;
  }

  const benchmarkMetrics = [
    {
      label: "API Response Time",
      value: metrics.apiTime ?? "—",
    },
    {
      label: "Cache Hits",
      value: metrics.cacheHits ?? 0,
    },
    {
      label: "Cache Misses",
      value: metrics.cacheMisses ?? 0,
    },
    {
      label: "Results Displayed",
      value: metrics.resultsDisplayed ?? 0,
    },
    {
      label: "DOM Render Time",
      value: metrics.renderTime ?? "—",
    },
    {
      label: "DOM Node Count",
      value: metrics.domNodeCount ?? 0,
    },
    {
      label: "Search-to-Display Time",
      value: metrics.totalSearchTime ?? "—",
    },
    {
      label: "Cache Hit Rate",
      value: metrics.cacheHitRate ?? "0%",
    },
  ];

  return (
    <aside
      id="benchmark-drawer"
      className="benchmark-drawer"
      aria-label="Performance benchmarks"
    >
      <div className="benchmark-header">
        <div>
          <h2>Performance Monitor</h2>
          <p>Live application metrics</p>
        </div>

        <button
          id="close-benchmark-btn"
          className="close-benchmark-btn"
          type="button"
          aria-label="Close performance monitor"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="benchmark-content">
        {benchmarkMetrics.map((metric) => (
          <div
            className="benchmark-metric"
            key={metric.label}
          >
            <span className="metric-label">
              {metric.label}
            </span>

            <strong className="metric-value">
              {metric.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="benchmark-footer">
        <p>
          Search requests are optimized using
          500ms debouncing, localStorage caching,
          and request cancellation.
        </p>

        <p>
          Rendering and search metrics are measured
          using the browser Performance API.
        </p>
      </div>
    </aside>
  );
}

export default BenchmarkDrawer;