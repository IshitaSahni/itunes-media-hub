function AudioPlayer({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  onTogglePlayback,
  onSeek,
  onVolumeChange,
}) {
  if (!currentTrack) {
    return null;
  }

  const title =
    currentTrack.trackName ||
    currentTrack.collectionName ||
    "Untitled Media";

  const artist =
    currentTrack.artistName || "Unknown Artist";

  const artwork = (
    currentTrack.artworkUrl100 ||
    currentTrack.artworkUrl60 ||
    currentTrack.artworkUrl30 ||
    ""
  ).replace(/\/\d+x\d+bb\./, "/300x300bb.");

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    return (
      minutes +
      ":" +
      String(remainingSeconds).padStart(2, "0")
    );
  }

  const progress =
    Number.isFinite(duration) && duration > 0
      ? (currentTime / duration) * 100
      : 0;

  return (
    <section
      id="audio-player-bar"
      className="audio-player-bar"
      aria-label="Audio preview player"
    >
      <div className="player-track">
        {artwork && (
          <img
            id="player-artwork"
            className="player-artwork"
            src={artwork}
            alt={`Artwork for ${title}`}
          />
        )}

        <div className="player-track-info">
          <h3 id="player-title">{title}</h3>
          <p id="player-artist">{artist}</p>
        </div>
      </div>

      <div className="player-main">
        <button
          id="player-play-btn"
          className="player-play-btn"
          type="button"
          aria-label={
            isPlaying ? "Pause preview" : "Play preview"
          }
          onClick={onTogglePlayback}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <div className="player-progress">
          <span id="player-current-time">
            {formatTime(currentTime)}
          </span>

          <input
            id="player-seek"
            type="range"
            min="0"
            max="100"
            value={progress}
            disabled={
              !Number.isFinite(duration) ||
              duration <= 0
            }
            aria-label="Seek through preview"
            onChange={(event) =>
              onSeek(Number(event.target.value))
            }
          />

          <span id="player-duration">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="player-volume">
        <span aria-hidden="true">🔊</span>

        <input
          id="player-volume"
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          aria-label="Volume"
          onChange={(event) =>
            onVolumeChange(
              Number(event.target.value) / 100
            )
          }
        />
      </div>
    </section>
  );
}

export default AudioPlayer;