function Header({ onOpenBenchmarks }) {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">
            ♫
          </div>

          <div className="brand-text">
            <h1>iTunes Media Hub</h1>
            <p>Discover. Explore. Listen.</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="tech-badge">
            React
          </span>

          <button
            id="benchmark-btn"
            className="benchmark-btn"
            type="button"
            onClick={onOpenBenchmarks}
          >
            View Benchmarks
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;