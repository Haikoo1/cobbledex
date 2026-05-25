/**
 * favorites.js — Favorites management via localStorage
 *
 * Features:
 * - Save/load favorites from localStorage (key: 'cobblemon-favorites')
 * - Toggle favorite status
 * - Check if a Pokémon is favorited
 * - Export favorites as JSON file
 */

const STORAGE_KEY = 'cobblemon-favorites';

/** @type {Array<number>} Cached favorite IDs */
let favorites = [];

/** @type {Array<Function>} Listeners for favorite changes */
let listeners = [];

/**
 * Load favorites from localStorage.
 * @returns {Array<number>} Array of favorite Pokémon IDs
 */
function loadFavorites() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    favorites = stored ? JSON.parse(stored) : [];
  } catch {
    favorites = [];
  }
  return favorites;
}

/**
 * Save current favorites to localStorage.
 */
function saveFavorites() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn('Failed to save favorites:', e);
  }
  notifyListeners();
}

/**
 * Toggle a Pokémon as favorite.
 * @param {number} id - Pokémon ID
 * @returns {boolean} New favorite status (true = favorited)
 */
function toggleFavorite(id) {
  const idx = favorites.indexOf(id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    saveFavorites();
    return false;
  } else {
    favorites.push(id);
    saveFavorites();
    return true;
  }
}

/**
 * Check if a Pokémon is favorited.
 * @param {number} id - Pokémon ID
 * @returns {boolean} Whether it's a favorite
 */
function isFavorite(id) {
  return favorites.includes(id);
}

/**
 * Get all favorite IDs.
 * @returns {Array<number>} Array of favorite IDs
 */
function getFavorites() {
  return [...favorites];
}

/**
 * Get total count of favorites.
 * @returns {number} Favorite count
 */
function getFavoriteCount() {
  return favorites.length;
}

/**
 * Export favorites as a downloadable JSON file.
 */
function exportFavorites() {
  const data = JSON.stringify(favorites, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cobblemon-favorites-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Subscribe to favorite changes.
 * @param {Function} listener - Callback with favorites array
 */
function onFavoritesChange(listener) {
  listeners.push(listener);
}

/**
 * Notify all listeners of changes.
 */
function notifyListeners() {
  listeners.forEach(fn => fn([...favorites]));
}

// Initialize on load
loadFavorites();

export {
  loadFavorites,
  toggleFavorite,
  isFavorite,
  getFavorites,
  getFavoriteCount,
  exportFavorites,
  onFavoritesChange,
  STORAGE_KEY,
};
