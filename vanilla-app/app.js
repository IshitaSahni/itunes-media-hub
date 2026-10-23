
"use strict";

// =============================================
// ITUNES MEDIA HUB — VANILLA JAVASCRIPT
// Complete through Step 5.6
// =============================================

// 1. CONFIGURATION

const API_BASE = "https://itunes.apple.com/search";
const SEARCH_LIMIT = 24;
const STORE_COUNTRY = "IN";

const DEBOUNCE_DELAY = 500;
const CACHE_DURATION = 10 * 60 * 1000;
const CACHE_PREFIX = "itunes_media_hub_";

const MEDIA_CATEGORIES = {
  all: {
    label: "All Media",
    media: "all"
  },
  music: {
    label: "Songs",
    media: "music",
    entity: "song"
  },
  podcast: {
    label: "Podcasts",
    media: "podcast",
    entity: "podcast"
  },
  audiobook: {
    label: "Audiobooks",
    media: "audiobook",
    entity: "audiobook"
  },
  musicVideo: {
    label: "Music Videos",
    media: "musicVideo",
    entity: "musicVideo"
  }
};

// 2. DOM ELEMENTS

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-btn");

const mediaGrid = document.getElementById("media-grid");
const statusMessage = document.getElementById("status-message");
const resultsTitle = document.getElementById("results-title");
const resultsCount = document.getElementById("results-count");

const categoryButtons =
  document.querySelectorAll(".category-btn");

const benchmarkButton =
  document.getElementById("benchmark-btn");
const benchmarkDrawer =
  document.getElementById("benchmark-drawer");
const closeBenchmarkButton =
  document.getElementById("close-benchmark-btn");

const apiTimeElement = document.getElementById("api-time");
const cacheHitsElement = document.getElementById("cache-hits");
const cacheMissesElement = document.getElementById("cache-misses");
const benchmarkResultsElement =
  document.getElementById("benchmark-results");

// Persistent player elements
const playerBar = document.getElementById("audio-player-bar");
const playerArtwork = document.getElementById("player-artwork");
const playerTitle = document.getElementById("player-title");
const playerArtist = document.getElementById("player-artist");
const playerPlayButton =
  document.getElementById("player-play-btn");
const playerSeek = document.getElementById("player-seek");
const playerCurrentTime =
  document.getElementById("player-current-time");
const playerDuration =
  document.getElementById("player-duration");
const playerVolume =
  document.getElementById("player-volume");

// 3. APPLICATION STATE

let activeCategory = "all";
let debounceTimer = null;
let activeController = null;
let currentRequestId = 0;

let cacheHits = 0;
let cacheMisses = 0;

// Shared audio instance
const audioPlayer = new Audio();
audioPlayer.preload = "metadata";
audioPlayer.volume = 0.8;

let currentTrack = null;
let currentPreviewUrl = null;
let currentPreviewButton = null;
let playbackRequestId = 0;

// 4. GENERAL HELPERS

function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
}

function resetResults() {
  mediaGrid.replaceChildren();

  resultsTitle.textContent = "Discover Media";
  resultsCount.textContent = "";
  benchmarkResultsElement.textContent = "0";
  apiTimeElement.textContent = "—";

  // Cards are removed, but audio continues playing.
  currentPreviewButton = null;
}

function updateCacheMetrics() {
  cacheHitsElement.textContent = String(cacheHits);
  cacheMissesElement.textContent = String(cacheMisses);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return (
    minutes + ":" +
    String(remainingSeconds).padStart(2, "0")
  );
}

function getArtwork(item) {
  const artwork =
    item.artworkUrl100 ||
    item.artworkUrl60 ||
    item.artworkUrl30 ||
    "";

  return artwork.replace(
    /\/\d+x\d+bb\./,
    "/300x300bb."
  );
}

function getTrackTitle(item) {
  return (
    item.trackName ||
    item.collectionName ||
    "Untitled Media"
  );
}

// 5. CACHE

function getCacheKey(query, category) {
  return (
    CACHE_PREFIX +
    STORE_COUNTRY + "_" +
    category + "_" +
    query.trim().toLowerCase()
  );
}

function getCachedResults(query, category) {
  const key = getCacheKey(query, category);

  try {
    const stored = localStorage.getItem(key);

    if (stored === null) {
      return null;
    }

    const entry = JSON.parse(stored);

    if (
      !entry ||
      !Array.isArray(entry.results) ||
      typeof entry.timestamp !== "number"
    ) {
      localStorage.removeItem(key);
      return null;
    }

    const age = Date.now() - entry.timestamp;

    if (age < 0 || age >= CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.results;

  } catch (error) {
    console.warn("Cache read failed:", error);
    return null;
  }
}

function saveCachedResults(query, category, results) {
  try {
    localStorage.setItem(
      getCacheKey(query, category),
      JSON.stringify({
        timestamp: Date.now(),
        results: results
      })
    );
  } catch (error) {
    console.warn("Cache write failed:", error);
  }
}

// 6. REQUEST CANCELLATION

function cancelActiveRequest() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

function invalidateCurrentSearch() {
  currentRequestId++;
  cancelActiveRequest();
  searchButton.disabled = false;
}

// =============================================
// 7. PERSISTENT AUDIO PLAYER
// =============================================

function updatePlaybackButtons() {
  const isPlaying =
    currentPreviewUrl !== null &&
    !audioPlayer.paused &&
    !audioPlayer.ended;

  playerPlayButton.textContent = isPlaying ? "⏸" : "▶";

  playerPlayButton.setAttribute(
    "aria-label",
    isPlaying ? "Pause preview" : "Play preview"
  );

  if (currentPreviewButton) {
    currentPreviewButton.textContent =
      isPlaying ? "⏸ Pause Preview" : "▶ Play Preview";
  }
}

function updatePlayerProgress() {
  const currentTime = audioPlayer.currentTime;
  const duration = audioPlayer.duration;

  playerCurrentTime.textContent = formatTime(currentTime);

  if (Number.isFinite(duration) && duration > 0) {
    playerDuration.textContent = formatTime(duration);

    playerSeek.value = String(
      (currentTime / duration) * 100
    );

    playerSeek.disabled = false;
  } else {
    playerDuration.textContent = "0:00";
    playerSeek.value = "0";
    playerSeek.disabled = true;
  }
}

function showPlayerForTrack(item) {
  currentTrack = item;

  playerTitle.textContent = getTrackTitle(item);
  playerArtist.textContent =
    item.artistName || "Unknown Artist";

  const artwork = getArtwork(item);

  if (artwork) {
    playerArtwork.src = artwork;
    playerArtwork.alt =
      "Artwork for " + getTrackTitle(item);
    playerArtwork.hidden = false;
  } else {
    playerArtwork.removeAttribute("src");
    playerArtwork.hidden = true;
  }

  playerBar.hidden = false;
}

async function startPlayback() {
  if (!currentPreviewUrl) {
    return;
  }

  const requestId = ++playbackRequestId;

  try {
    await audioPlayer.play();

    if (requestId === playbackRequestId) {
      updatePlaybackButtons();
    }
  } catch (error) {
    if (requestId !== playbackRequestId) {
      return;
    }

    if (error.name !== "AbortError") {
      console.error("Audio playback failed:", error);
    }

    updatePlaybackButtons();
  }
}

function togglePreview(item, button) {
  if (!item.previewUrl) {
    return;
  }

  const previewUrl = item.previewUrl;

  // Clicking the currently selected track toggles playback.
  if (currentPreviewUrl === previewUrl) {
    currentPreviewButton = button;

    if (audioPlayer.paused || audioPlayer.ended) {
      if (audioPlayer.ended) {
        audioPlayer.currentTime = 0;
      }

      startPlayback();
    } else {
      playbackRequestId++;
      audioPlayer.pause();
      updatePlaybackButtons();
    }

    return;
  }

  // Reset the previous card's button.
  if (currentPreviewButton) {
    currentPreviewButton.textContent = "▶ Play Preview";
  }

  // Stop the previous preview before changing sources.
  playbackRequestId++;
  audioPlayer.pause();

  currentPreviewUrl = previewUrl;
  currentPreviewButton = button;

  audioPlayer.src = previewUrl;
  audioPlayer.load();

  showPlayerForTrack(item);
  updatePlayerProgress();
  updatePlaybackButtons();

  startPlayback();
}

// Bottom play/pause button
playerPlayButton.addEventListener("click", () => {
  if (!currentPreviewUrl) {
    return;
  }

  if (audioPlayer.paused || audioPlayer.ended) {
    if (audioPlayer.ended) {
      audioPlayer.currentTime = 0;
    }

    startPlayback();
  } else {
    playbackRequestId++;
    audioPlayer.pause();
    updatePlaybackButtons();
  }
});

// Seek through the preview
playerSeek.addEventListener("input", () => {
  const duration = audioPlayer.duration;

  if (!Number.isFinite(duration) || duration <= 0) {
    return;
  }

  const percentage = Number(playerSeek.value);

  audioPlayer.currentTime =
    (percentage / 100) * duration;

  updatePlayerProgress();
});

// Adjust volume
playerVolume.addEventListener("input", () => {
  audioPlayer.volume =
    Number(playerVolume.value) / 100;
});

// Synchronize UI with actual audio events
audioPlayer.addEventListener("play", updatePlaybackButtons);
audioPlayer.addEventListener("pause", updatePlaybackButtons);
audioPlayer.addEventListener("timeupdate", updatePlayerProgress);
audioPlayer.addEventListener("loadedmetadata", updatePlayerProgress);
audioPlayer.addEventListener("durationchange", updatePlayerProgress);

audioPlayer.addEventListener("ended", () => {
  playbackRequestId++;
  updatePlaybackButtons();
  updatePlayerProgress();
});

audioPlayer.addEventListener("error", () => {
  if (!currentPreviewUrl) {
    return;
  }

  console.error("Unable to load audio preview.");
  updatePlaybackButtons();
});

// =============================================
// 8. MEDIA CARDS
// =============================================

function createMediaCard(item) {
  const card = document.createElement("article");
  card.className = "media-card";

  // Artwork
  const image = document.createElement("img");
  image.className = "media-artwork";
  image.loading = "lazy";

  const artwork = getArtwork(item);

  if (artwork) {
    image.src = artwork;
    image.alt = "Artwork for " + getTrackTitle(item);
  } else {
    image.alt = "Artwork unavailable";
  }

  // Information
  const info = document.createElement("div");
  info.className = "media-info";

  const title = document.createElement("h3");
  title.className = "media-title";
  title.textContent = getTrackTitle(item);

  const artist = document.createElement("p");
  artist.className = "media-artist";
  artist.textContent =
    item.artistName || "Unknown Artist";

  const meta = document.createElement("div");
  meta.className = "media-meta";

  const genre = document.createElement("span");
  genre.textContent =
    item.primaryGenreName || "Media";

  const year = document.createElement("span");

  if (item.releaseDate) {
    const parsedYear =
      new Date(item.releaseDate).getFullYear();

    year.textContent = Number.isNaN(parsedYear)
      ? "—"
      : String(parsedYear);
  } else {
    year.textContent = "—";
  }

  meta.append(genre, year);

  // Preview button
  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.className = "media-preview-btn";

  if (item.previewUrl) {
    previewButton.disabled = false;

    const isSelected =
      item.previewUrl === currentPreviewUrl;

    previewButton.textContent =
      isSelected && !audioPlayer.paused
        ? "⏸ Pause Preview"
        : "▶ Play Preview";

    if (isSelected) {
      currentPreviewButton = previewButton;
    }

    previewButton.addEventListener("click", () => {
      togglePreview(item, previewButton);
    });
  } else {
    previewButton.textContent = "No Preview";
    previewButton.disabled = true;
  }

  info.append(
    title,
    artist,
    meta,
    previewButton
  );

  card.append(image, info);

  return card;
}

// =============================================
// 9. RENDER RESULTS
// =============================================

function renderResults(items, query, category) {
  mediaGrid.replaceChildren();

  // The previous card may no longer exist.
  currentPreviewButton = null;

  resultsTitle.textContent =
    MEDIA_CATEGORIES[category].label + " Results";

  resultsCount.textContent =
    `${items.length} results displayed`;

  benchmarkResultsElement.textContent =
    String(items.length);

  if (items.length === 0) {
    showStatus(
      `No results found for "${query}". Try another search.`
    );
    return;
  }

  hideStatus();

  const fragment =
    document.createDocumentFragment();

  items.forEach((item) => {
    fragment.appendChild(createMediaCard(item));
  });

  mediaGrid.appendChild(fragment);
}

// =============================================
// 10. SEARCH
// =============================================

async function searchMedia(query) {
  const term = query.trim();

  const requestId = ++currentRequestId;

  cancelActiveRequest();
  searchButton.disabled = false;

  if (!term) {
    resetResults();

    showStatus(
      "Enter a search term to explore media."
    );

    return;
  }

  const requestedCategory = activeCategory;
  const selectedCategory =
    MEDIA_CATEGORIES[requestedCategory];

  // Cache lookup
  const cacheStartTime = performance.now();

  const cachedResults = getCachedResults(
    term,
    requestedCategory
  );

  if (cachedResults !== null) {
    cacheHits++;
    updateCacheMetrics();

    const cacheDuration =
      performance.now() - cacheStartTime;

    apiTimeElement.textContent =
      `Cache: ${cacheDuration.toFixed(2)} ms`;

    renderResults(
      cachedResults,
      term,
      requestedCategory
    );

    console.log(
      `[CACHE HIT] ${term} | ${requestedCategory}`
    );

    return;
  }

  cacheMisses++;
  updateCacheMetrics();

  mediaGrid.replaceChildren();
  currentPreviewButton = null;

  resultsTitle.textContent = "Searching...";
  resultsCount.textContent = "";
  benchmarkResultsElement.textContent = "0";
  apiTimeElement.textContent = "Loading...";

  showStatus(
    `Searching ${selectedCategory.label.toLowerCase()} ` +
    `for "${term}"...`
  );

  searchButton.disabled = true;

  const params = new URLSearchParams({
    term: term,
    country: STORE_COUNTRY,
    media: selectedCategory.media,
    limit: String(SEARCH_LIMIT),
    explicit: "No"
  });

  if (selectedCategory.entity) {
    params.set("entity", selectedCategory.entity);
  }

  const url = `${API_BASE}?${params.toString()}`;

  const controller = new AbortController();
  activeController = controller;

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (requestId !== currentRequestId) {
      return;
    }

    if (!Array.isArray(data.results)) {
      throw new Error(
        "Invalid response from the iTunes API"
      );
    }

    const duration = performance.now() - startTime;

    apiTimeElement.textContent =
      `${duration.toFixed(0)} ms`;

    saveCachedResults(
      term,
      requestedCategory,
      data.results
    );

    renderResults(
      data.results,
      term,
      requestedCategory
    );

    console.log(
      `[API SUCCESS] ${term} | ${requestedCategory} | ` +
      `${data.results.length} results | ` +
      `${duration.toFixed(0)} ms`
    );

  } catch (error) {
    if (requestId !== currentRequestId) {
      return;
    }

    if (error.name === "AbortError") {
      return;
    }

    console.error("iTunes API search failed:", error);

    resultsTitle.textContent = "Search Failed";
    resultsCount.textContent = "";
    apiTimeElement.textContent = "Failed";

    showStatus(
      "Unable to load results. Check your connection " +
      "and try again."
    );

  } finally {
    if (activeController === controller) {
      activeController = null;
    }

    if (requestId === currentRequestId) {
      searchButton.disabled = false;
    }
  }
}

// =============================================
// 11. CATEGORY FILTERS
// =============================================

function selectCategory(category) {
  if (!MEDIA_CATEGORIES[category]) {
    return;
  }

  activeCategory = category;

  categoryButtons.forEach((button) => {
    const isActive =
      button.dataset.category === category;

    button.classList.toggle("active", isActive);

    button.setAttribute(
      "aria-pressed",
      String(isActive)
    );
  });

  clearTimeout(debounceTimer);
  debounceTimer = null;

  const query = searchInput.value.trim();

  if (query) {
    searchMedia(query);
  } else {
    invalidateCurrentSearch();
    resetResults();

    showStatus(
      `Enter a search term to explore ` +
      `${MEDIA_CATEGORIES[category].label.toLowerCase()}.`
    );
  }
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectCategory(button.dataset.category);
  });
});

// =============================================
// 12. DEBOUNCED SEARCH
// =============================================

searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = null;

  invalidateCurrentSearch();

  const query = searchInput.value.trim();

  if (!query) {
    resetResults();

    showStatus(
      "Enter a search term to explore media."
    );

    return;
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    searchMedia(query);
  }, DEBOUNCE_DELAY);
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  clearTimeout(debounceTimer);
  debounceTimer = null;

  searchMedia(searchInput.value);
});

// =============================================
// 13. BENCHMARK DRAWER
// =============================================

benchmarkButton.addEventListener("click", () => {
  benchmarkDrawer.hidden = false;

  benchmarkButton.setAttribute(
    "aria-expanded",
    "true"
  );
});

closeBenchmarkButton.addEventListener("click", () => {
  benchmarkDrawer.hidden = true;

  benchmarkButton.setAttribute(
    "aria-expanded",
    "false"
  );
});

// =============================================
// 14. INITIALIZATION
// =============================================

function initializeApp() {
  resetResults();
  updateCacheMetrics();

  playerVolume.value = "80";
  playerSeek.disabled = true;
  playerBar.hidden = true;

  selectCategory("all");

  console.log(
    "iTunes Media Hub initialized successfully."
  );
}

initializeApp();
