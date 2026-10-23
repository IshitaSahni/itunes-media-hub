function SearchBar({ query, onQueryChange, onSearch, loading }) {
  function handleSubmit(event) {
    event.preventDefault();
    onSearch();
  }

  return (
    <section className="search-section" aria-label="Search media">
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <span className="search-icon" aria-hidden="true">
            ⌕
          </span>

          <input
            id="search-input"
            className="search-input"
            type="search"
            placeholder="Search artists, songs, podcasts..."
            aria-label="Search iTunes media"
            autoComplete="off"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />

          <button
            id="search-btn"
            className="search-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      <p className="search-hint">
        Discover your next favourite track, podcast, or story.
      </p>
    </section>
  );
}

export default SearchBar;