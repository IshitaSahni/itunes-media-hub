import MediaCard from "./MediaCard";

function MediaGrid({
  items,
  query,
  activeCategory,
  loading,
  error,
  hasSearched,
  onPlayPreview,
  currentPreviewUrl,
  isPlaying,
}) {
  const categoryLabels = {
    all: "All Media",
    music: "Songs",
    podcast: "Podcasts",
    audiobook: "Audiobooks",
    musicVideo: "Music Videos",
  };

  const resultsTitle = loading
    ? "Searching..."
    : hasSearched && !error
      ? `${categoryLabels[activeCategory]} Results`
      : error
        ? "Search Failed"
        : "Discover Media";

  let status = "";

  if (loading) {
    status = `Searching ${categoryLabels[activeCategory].toLowerCase()} for "${query}"...`;
  } else if (error) {
    status = error;
  } else if (!hasSearched) {
    status = "Enter a search term to explore media.";
  } else if (items.length === 0) {
    status = `No results found for "${query}". Try another search.`;
  }

  return (
    <section className="results-section" aria-label="Media search results">
      <div className="results-header">
        <div>
          <h2 id="results-title">{resultsTitle}</h2>

          <p id="results-count">
            {hasSearched && !loading && !error
              ? `${items.length} results displayed`
              : ""}
          </p>
        </div>
      </div>

      {status && (
        <p
          id="status-message"
          className="status-message"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      )}

      <div id="media-grid" className="media-grid">
        {items.map((item, index) => (
          <MediaCard
            key={`${item.trackId || item.collectionId || "media"}-${index}`}
            item={item}
            onPlayPreview={onPlayPreview}
            currentPreviewUrl={currentPreviewUrl}
            isPlaying={isPlaying}
          />
        ))}
      </div>
    </section>
  );
}

export default MediaGrid;