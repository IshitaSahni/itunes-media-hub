function MediaCard({ item, onPlayPreview, currentPreviewUrl, isPlaying }) {
  const title =
    item.trackName ||
    item.collectionName ||
    "Untitled Media";

  const artist = item.artistName || "Unknown Artist";

  const artwork = (
    item.artworkUrl100 ||
    item.artworkUrl60 ||
    item.artworkUrl30 ||
    ""
  ).replace(/\/\d+x\d+bb\./, "/300x300bb.");

  const genre = item.primaryGenreName || "Media";

  let year = "—";

  if (item.releaseDate) {
    const parsedYear = new Date(item.releaseDate).getFullYear();

    if (!Number.isNaN(parsedYear)) {
      year = String(parsedYear);
    }
  }

  const hasPreview = Boolean(item.previewUrl);

  const isCurrentTrack =
    hasPreview && currentPreviewUrl === item.previewUrl;

  return (
    <article className="media-card">
      <img
        className="media-artwork"
        src={artwork || undefined}
        alt={artwork ? `Artwork for ${title}` : "Artwork unavailable"}
        loading="lazy"
      />

      <div className="media-info">
        <h3 className="media-title">{title}</h3>

        <p className="media-artist">{artist}</p>

        <div className="media-meta">
          <span>{genre}</span>
          <span>{year}</span>
        </div>

        <button
          type="button"
          className="media-preview-btn"
          disabled={!hasPreview}
          onClick={() => onPlayPreview(item)}
        >
          {!hasPreview
            ? "No Preview"
            : isCurrentTrack && isPlaying
              ? "⏸ Pause Preview"
              : "▶ Play Preview"}
        </button>
      </div>
    </article>
  );
}

export default MediaCard;