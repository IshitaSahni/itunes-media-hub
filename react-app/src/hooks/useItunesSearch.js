import { useCallback, useEffect, useRef, useState } from "react";

import { searchItunes } from "../services/itunesApi.js";
import {
  getCachedResults,
  setCachedResults,
} from "../utils/cache.js";

export default function useItunesSearch() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

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
        return;
      }

      const startTime = performance.now();

      setLoading(true);
      setError(null);

      const cachedResults = getCachedResults(
        trimmedQuery,
        category
      );

      if (cachedResults !== null) {
        hitsRef.current += 1;

        const totalTime = performance.now() - startTime;

        setItems(cachedResults);
        setHasSearched(true);
        setLoading(false);

        setSearchMetrics({
          apiTime: "Cached",
          cacheHits: hitsRef.current,
          cacheMisses: missesRef.current,
          totalSearchTime: `${totalTime.toFixed(2)} ms`,
          cacheHitRate: `${(
            (hitsRef.current /
              (hitsRef.current + missesRef.current)) *
            100
          ).toFixed(1)}%`,
        });

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

        const apiTime = performance.now() - apiStartTime;
        const totalTime = performance.now() - startTime;

        setCachedResults(trimmedQuery, category, results);

        setItems(results);
        setHasSearched(true);

        setSearchMetrics({
          apiTime: `${apiTime.toFixed(2)} ms`,
          cacheHits: hitsRef.current,
          cacheMisses: missesRef.current,
          totalSearchTime: `${totalTime.toFixed(2)} ms`,
          cacheHitRate: `${(
            (hitsRef.current /
              (hitsRef.current + missesRef.current)) *
            100
          ).toFixed(1)}%`,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        if (requestId !== requestIdRef.current) {
          return;
        }

        setItems([]);
        setError(
          "Unable to load media. Please try again."
        );
        setHasSearched(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const search = useCallback(() => {
    executeSearch(query, activeCategory);
  }, [query, activeCategory, executeSearch]);

  const changeCategory = useCallback(
    (category) => {
      setActiveCategory(category);

      if (query.trim()) {
        executeSearch(query, category);
      }
    },
    [query, executeSearch]
  );

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (!query.trim()) {
      controllerRef.current?.abort();
      requestIdRef.current += 1;
      setItems([]);
      setLoading(false);
      setHasSearched(false);
      setError(null);
      return;
    }

    timerRef.current = setTimeout(() => {
      executeSearch(query, activeCategory);
    }, 500);

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
    search,
    changeCategory,
  };
}