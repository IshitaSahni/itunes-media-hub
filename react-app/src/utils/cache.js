const CACHE_PREFIX = "itunes-react-cache:";
const CACHE_DURATION = 10 * 60 * 1000;

export function createCacheKey(query, category) {
  return (
    CACHE_PREFIX +
    JSON.stringify({
      query: query.trim().toLowerCase(),
      category,
      country: "IN",
    })
  );
}

export function getCachedResults(query, category) {
  const key = createCacheKey(query, category);

  try {
    const cached = localStorage.getItem(key);

    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached);

    if (
      !parsed ||
      !Array.isArray(parsed.results) ||
      Date.now() - parsed.timestamp >= CACHE_DURATION
    ) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.results;
  } catch {
    return null;
  }
}

export function setCachedResults(query, category, results) {
  const key = createCacheKey(query, category);

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        results,
      })
    );
  } catch {
    // Continue normally if browser storage is unavailable.
  }
}