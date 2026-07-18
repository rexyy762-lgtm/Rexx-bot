// ============================================================
// utils/giphy.js — Fetch a random GIF from the GIPHY API
// ============================================================

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

/**
 * Search GIPHY and return a random GIF URL from the top results.
 * @param {string} query  Search term, e.g. "anime hug"
 * @param {number} limit  Pool size to pick randomly from (default 25)
 * @returns {Promise<string>} Direct GIF URL
 */
async function getGif(query, limit = 25) {
  if (!GIPHY_API_KEY) throw new Error('GIPHY_API_KEY is not set in environment secrets.');

  const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g&lang=en`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`GIPHY request failed: ${res.status}`);

  const { data } = await res.json();
  if (!data || data.length === 0) throw new Error(`No GIFs found for query: ${query}`);

  // Pick a random entry from the pool so each call returns something different
  const pick = data[Math.floor(Math.random() * data.length)];
  return pick.images.original.url;
}

module.exports = { getGif };
