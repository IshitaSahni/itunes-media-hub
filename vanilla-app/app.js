console.log("Media Hub JavaScript loaded successfully!");

"use strict";

// ============================================
// ITUNES MEDIA HUB — VANILLA JAVASCRIPT
// Step 5.3: Search API and media cards
// ============================================

// 1. API configuration
const API_BASE = "https://itunes.apple.com/search";
const SEARCH_LIMIT = 24;
const STORE_COUNTRY = "IN";

// 2. DOM references
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-btn");

const mediaGrid = document.getElementById("media-grid");
const statusMessage = document.getElementById("status-message");
const resultsTitle = document.getElementById("results-title");
const resultsCount = document.getElementById("results-count");

const apiTime = document.getElementById("api-time");
const benchmarkResults =
  document.getElementById("benchmark-results");

const benchmarkButton =
  document.getElementById("benchmark-btn");
const benchmarkDrawer =
  document.getElementById("benchmark-drawer");
const closeBenchmarkButton =
  document.getElementById("close-benchmark-btn");

// 3. Application state
let currentRequestId = 0;

// 4. Display status messages
function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
}

// 5. Create an individual media card
function createMediaCard(item) {
  const card = document.createElement("article");
  card.className = "media-card";

  const image = document.createElement("img");
  image.className = "media-artwork";
  image.alt = item.trackName || item.collectionName ||
    "Media artwork";
  image.loading = "lazy";

  const artwork =
    item.artworkUrl100 || item.artworkUrl60;

  if (artwork) {
    image.src = artwork;
  } else {
    image.alt = "Artwork unavailable";
  }

  const info = document.createElement("div");
  info.className = "media-info";

  const title = document.createElement("h3");
  title.className = "media-title";
  title.textContent =
    item.trackName ||
    item.collectionName ||
    item.artistName ||
    "Untitled Media";

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
  year.textContent = item.releaseDate
    ? new Date(item.releaseDate).getFullYear()
    : "—";

  meta.append(genre, year);

  const previewButton = document.createElement("button");
  previewButton.className = "media-preview-btn";
  previewButton.type = "button";

  if (item.previewUrl) {
    previewButton.textContent = "Preview Available";
    previewButton.title =
      "Audio player will be implemented in Step 5.6";
    previewButton.disabled = true;
  } else {
    previewButton.textContent = "No Preview";
    previewButton.disabled = true;
  }

  info.append(title, artist, meta, previewButton);
  card.append(image, info);

  return card;
}

// 6. Render search results
function renderResults(items) {
  mediaGrid.replaceChildren();

  resultsTitle.textContent = "Search Results";
  resultsCount.textContent =
    `${items.length} results displayed`;

  benchmarkResults.textContent = items.length;

  if (items.length === 0) {
    showStatus("No results found. Try another search.");
    return;
  }

  hideStatus();

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    fragment.appendChild(createMediaCard(item));
  });

  mediaGrid.appendChild(fragment);
}

// 7. Fetch media from the iTunes Search API
async function searchMedia(query) {
  const term = query.trim();

  if (!term) {
    showStatus("Please enter a search term.");
    return;
  }

  // Prevent older requests from changing the UI.
  const requestId = ++currentRequestId;

  mediaGrid.replaceChildren();
  resultsCount.textContent = "";
  resultsTitle.textContent = "Searching...";
  showStatus(`Searching for "${term}"...`);

  searchButton.disabled = true;

  const params = new URLSearchParams({
    term: term,
    country: STORE_COUNTRY,
    media: "all",
    limit: String(SEARCH_LIMIT),
    explicit: "No"
  });

  const url = `${API_BASE}?${params.toString()}`;
  const startTime = performance.now();

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `API request failed: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (requestId !== currentRequestId) {
      return;
    }

    if (!Array.isArray(data.results)) {
      throw new Error("Invalid API response format");
    }

    const duration = performance.now() - startTime;
    apiTime.textContent = `${duration.toFixed(0)} ms`;

    renderResults(data.results);

  } catch (error) {
    if (requestId !== currentRequestId) {
      return;
    }

    console.error("Search error:", error);

    resultsTitle.textContent = "Search Failed";
    resultsCount.textContent = "";
    showStatus(
      "Unable to load results. Please try again."
    );

  } finally {
    if (requestId === currentRequestId) {
      searchButton.disabled = false;
    }
  }
}

// 8. Search form event
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchMedia(searchInput.value);
});

// 9. Benchmark drawer controls
benchmarkButton.addEventListener("click", () => {
  benchmarkDrawer.hidden = false;
  benchmarkButton.setAttribute(
    "aria-expanded", "true"
  );
});

closeBenchmarkButton.addEventListener("click", () => {
  benchmarkDrawer.hidden = true;
  benchmarkButton.setAttribute(
    "aria-expanded", "false"
  );
});

// 10. Initial state
showStatus("Enter a search term to explore media.");
