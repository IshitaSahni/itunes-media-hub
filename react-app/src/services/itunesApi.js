const ITUNES_API_URL = "https://itunes.apple.com/search";

const CATEGORY_PARAMETERS = {
  all: {},
  music: {
    media: "music",
    entity: "song",
  },
  podcast: {
    media: "podcast",
    entity: "podcast",
  },
  audiobook: {
    media: "audiobook",
    entity: "audiobook",
  },
  musicVideo: {
    media: "music",
    entity: "musicVideo",
  },
};

export async function searchItunes(
  query,
  category = "all",
  signal
) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const parameters = new URLSearchParams({
    term: trimmedQuery,
    country: "IN",
    limit: "24",
    ...CATEGORY_PARAMETERS[category],
  });

  const response = await fetch(
    `${ITUNES_API_URL}?${parameters.toString()}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error(
      `iTunes API request failed: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data.results)
    ? data.results
    : [];
}