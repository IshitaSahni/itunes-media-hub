import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { searchItunes } from "../services/itunesApi";
import {
  getCachedResults,
  setCachedResults,
} from "../utils/cache";

export default function useItunesSearch() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("all");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [completedSearch, setCompletedSearch] =
    useState(null);

  const [searchMetrics, setSearchMetrics] = useState({
    apiTime: "—",
    cacheHits: 0,
    cacheMisses: 0,
    totalSearchTime: "—",
    cacheHitRate: "0%",
  });

  const controllerRef = useRef(null);
  const timerRef = useRef(null);
  const requestIdRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);

  const executeSearch = useCallback(
    async (searchQuery, category) => {
      const trimmedQuery = searchQuery.trim();

      clearTimeout(timerRef.current);
      controllerRef.current?.abort();

      const requestId = ++requestIdRef.current;

      if (!trimmedQuery) {
        setItems([]);
        setLoading(false);
        setError(null);
        setHasSearched(false);
        setCompletedSearch(null);
        return;
      }

      const startTime = performance.now();

      setLoading(true);
      setError(null);
      setCompletedSearch(null);

      const cachedResults = getCachedResults(
        trimmedQuery,
        category
      );

      if (cachedResults !== null) {
        hitsRef.current += 1;

        setItems(cachedResults);
        setHasSearched(true);
        setLoading(false);

        setCompletedSearch({
          requestId,
          startTime,
        });

        setSearchMetrics((previous) => ({
          ...previous,
          apiTime: "Cached",
          cacheHits: hitsRef.current,
          cacheMisses: missesRef.current,
          totalSearchTime: "Measuring...",
          cacheHitRate: `${(
            (hitsRef.current /
              (hitsRef.current + missesRef.current)) *
            100
          ).toFixed(1)}%`,
        }));

        return;
      }

      missesRef.current += 1;

      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const apiStartTime = performance.now();

        const results = await searchItunes(
          trimmedQuery,
          category,
          controller.signal
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        const apiTime =
          performance.now() - apiStartTime;

        setCachedResults(
          trimmedQuery,
          category,
          results
        );

        setItems(results);
        setHasSearched(true);

        setCompletedSearch({
          requestId,
          startTime,
        });

        setSearchMetrics((previous) => ({
          ...previous,
          apiTime: `${apiTime.toFixed(2)} ms`,
          cacheHits: hitsRef.current,
          cacheMisses: missesRef.current,
          totalSearchTime: "Measuring...",
          cacheHitRate: `${(
            (hitsRef.current /
              (hitsRef.current + missesRef.current)) *
            100
          ).toFixed(1)}%`,
        }));
      } catch (err) {
        if (
          err.name === "AbortError" ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        setItems([]);
        setError(
          "Unable to load media. Please try again."
        );
        setHasSearched(true);
        setCompletedSearch(null);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const markResultsDisplayed = useCallback(
    (requestId, elapsedTime) => {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSearchMetrics((previous) => ({
        ...previous,
        totalSearchTime: `${elapsedTime.toFixed(2)} ms`,
      }));
    },
    []
  );

  const search = useCallback(() => {
    executeSearch(query, activeCategory);
  }, [query, activeCategory, executeSearch]);

  const changeCategory = useCallback(
    (category) => {
      setActiveCategory(category);
    },
    []
  );

  useEffect(() => {
  clearTimeout(timerRef.current);

  if (!query.trim()) {
    timerRef.current = setTimeout(() => {
      executeSearch("", activeCategory);
    }, 0);
  } else {
    timerRef.current = setTimeout(() => {
      executeSearch(query, activeCategory);
    }, 500);
  }

  return () => {
    clearTimeout(timerRef.current);
  };
}, [query, activeCategory, executeSearch]);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      controllerRef.current?.abort();
    };
  }, []);

  return {
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
  };
}