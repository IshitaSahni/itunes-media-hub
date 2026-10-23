import {
  Profiler,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryFilters from "./components/CategoryFilters";
import MediaGrid from "./components/MediaGrid";
import BenchmarkDrawer from "./components/BenchmarkDrawer";
import AudioPlayer from "./components/AudioPlayer";

import useItunesSearch from "./hooks/useItunesSearch";
import useAudioPlayer from "./hooks/useAudioPlayer";

import {
  countDOMNodes,
  formatMilliseconds,
} from "./utils/performance";

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
    completedSearch,
    markResultsDisplayed,
    search,
    changeCategory,
  } = useItunesSearch();

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playPreview,
    togglePlayback,
    seek,
    changeVolume,
  } = useAudioPlayer();

  const [isBenchmarkOpen, setIsBenchmarkOpen] =
    useState(false);

  const [renderMetrics, setRenderMetrics] = useState({
    renderTime: "—",
    domNodeCount: 0,
  });

  const gridRef = useRef(null);
  const profilerDurationRef = useRef(null);
  const measuredSearchRef = useRef(null);

  const handleRender = useCallback(
    (id, phase, actualDuration) => {
      if (id === "media-results" &&
          (phase === "mount" || phase === "update")) {
        profilerDurationRef.current = actualDuration;
      }
    },
    []
  );

  useLayoutEffect(() => {
    if (!completedSearch) {
      return;
    }

    if (
      measuredSearchRef.current ===
      completedSearch.requestId
    ) {
      return;
    }

    measuredSearchRef.current =
      completedSearch.requestId;

    const nodeCount = countDOMNodes(gridRef.current);

    const elapsedTime =
      performance.now() - completedSearch.startTime;

    setRenderMetrics({
      renderTime: formatMilliseconds(
        profilerDurationRef.current
      ),
      domNodeCount: nodeCount,
    });

    markResultsDisplayed(
      completedSearch.requestId,
      elapsedTime
    );
  }, [completedSearch, markResultsDisplayed]);

  const metrics = {
    ...searchMetrics,
    resultsDisplayed: items.length,
    ...renderMetrics,
  };

  return (
    <>
      <Header
        onOpenBenchmarks={() =>
          setIsBenchmarkOpen(true)
        }
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

        <Profiler
          id="media-results"
          onRender={handleRender}
        >
          <MediaGrid
            ref={gridRef}
            items={items}
            query={query}
            activeCategory={activeCategory}
            loading={loading}
            error={error}
            hasSearched={hasSearched}
            onPlayPreview={playPreview}
            currentPreviewUrl={
              currentTrack?.previewUrl ?? null
            }
            isPlaying={isPlaying}
          />
        </Profiler>
      </main>

      <BenchmarkDrawer
        isOpen={isBenchmarkOpen}
        onClose={() =>
          setIsBenchmarkOpen(false)
        }
        metrics={metrics}
      />

      <AudioPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        onTogglePlayback={togglePlayback}
        onSeek={seek}
        onVolumeChange={changeVolume}
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