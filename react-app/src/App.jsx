import { useState } from "react";

import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryFilters from "./components/CategoryFilters";
import MediaGrid from "./components/MediaGrid";
import BenchmarkDrawer from "./components/BenchmarkDrawer";
import AudioPlayer from "./components/AudioPlayer";

import useItunesSearch from "./hooks/useItunesSearch";

import "./App.css";

function App() {
  const {
    query,
    setQuery,
    activeCategory,
    items,
    loading,
    error,
    hasSearched,
    searchMetrics,
    search,
    changeCategory,
  } = useItunesSearch();

  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  // Audio playback will be connected in Step 5.
  const currentTrack = null;
  const isPlaying = false;
  const currentTime = 0;
  const duration = 0;
  const volume = 0.8;

  const metrics = {
    ...searchMetrics,
    resultsDisplayed: items.length,
    renderTime: "—",
    domNodeCount: 0,
  };

  return (
    <>
      <Header
        onOpenBenchmarks={() => setIsBenchmarkOpen(true)}
      />

      <main className="app-container">
        <section className="hero-section">
          <div className="hero-content">
            <span className="hero-label">
              ALL YOUR MEDIA. ONE PLACE.
            </span>

            <h2>
              Explore a world of{" "}
              <span className="gradient-text">
                entertainment.
              </span>
            </h2>

            <p className="hero-description">
              Search songs, podcasts, audiobooks, and music
              videos from the iTunes catalogue — all in one place.
            </p>
          </div>
        </section>

        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={search}
          loading={loading}
        />

        <CategoryFilters
          activeCategory={activeCategory}
          onCategoryChange={changeCategory}
        />

        <MediaGrid
          items={items}
          query={query}
          activeCategory={activeCategory}
          loading={loading}
          error={error}
          hasSearched={hasSearched}
          onPlayPreview={() => {}}
          currentPreviewUrl={null}
          isPlaying={isPlaying}
        />
      </main>

      <BenchmarkDrawer
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        metrics={metrics}
      />

      <AudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlayback={() => {}}
        onSeek={() => {}}
        onVolumeChange={() => {}}
      />

      <footer className="app-footer">
        <p>
          iTunes All-In-One Media Hub
          <span aria-hidden="true"> • </span>
          Built with React
        </p>

        <p>
          Media data provided by the iTunes Search API.
        </p>
      </footer>
    </>
  );
}

export default App;