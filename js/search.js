/**
 * search.js — Search, filtering, and sorting logic
 *
 * Features:
 * - Name search with 300ms debounce
 * - Type filter (single or multiple)
 * - Generation filter
 * - Minimum stats range filter
 * - Sort by number, name, HP, Attack, Speed (asc/desc)
 * - URL query param sync (?type=fire&gen=1)
 */

import { allPokemon, filteredPokemon } from './data.js';

/** @type {string} Current search query */
let searchQuery = '';

/** @type {Array<string>} Active type filters */
let activeTypes = [];

/** @type {number|null} Active generation filter */
let activeGeneration = null;

/** @type {Array<string>} Active rarity filters */
let activeRarities = [];

/** @type {Object} Minimum stat values */
let minStats = {
  hp: 0,
  attack: 0,
  defense: 0,
  spAtk: 0,
  spDef: 0,
  speed: 0,
};

/** @type {Object} Sort configuration */
let sortConfig = {
  field: 'id',
  direction: 'asc',
};

/** @type {Function|null} Callback when results change */
let onResultsChange = null;

/** @type {number|null} Debounce timer handle */
let debounceTimer = null;

/**
 * Initialize search with a callback for result changes.
 * @param {Function} callback - Called with filtered results array
 */
function initSearch(callback) {
  onResultsChange = callback;
  syncFromURL();
}

/**
 * Set the search query string.
 * @param {string} query - Search text
 */
function setSearchQuery(query) {
  searchQuery = query.toLowerCase().trim();
  debounceApply();
}

/**
 * Toggle a type filter on/off.
 * @param {string} type - Type name (e.g., "Fire")
 */
function toggleTypeFilter(type) {
  const idx = activeTypes.indexOf(type);
  if (idx >= 0) {
    activeTypes.splice(idx, 1);
  } else {
    activeTypes.push(type);
  }
  applyFilters();
}

/**
 * Set type filters directly.
 * @param {Array<string>} types - Array of type names
 */
function setTypeFilters(types) {
  activeTypes = [...types];
  applyFilters();
}

/**
 * Clear all type filters.
 */
function clearTypeFilters() {
  activeTypes = [];
  applyFilters();
}

/**
 * Toggle a rarity filter on/off.
 * @param {string} rarity - Rarity name (e.g., "Common")
 */
function toggleRarityFilter(rarity) {
  const idx = activeRarities.indexOf(rarity);
  if (idx >= 0) {
    activeRarities.splice(idx, 1);
  } else {
    activeRarities.push(rarity);
  }
  applyFilters();
}

/**
 * Set rarity filters directly.
 * @param {Array<string>} rarities - Array of rarity names
 */
function setRarityFilters(rarities) {
  activeRarities = [...rarities];
  applyFilters();
}

/**
 * Clear all rarity filters.
 */
function clearRarityFilters() {
  activeRarities = [];
  applyFilters();
}

/**
 * Set generation filter.
 * @param {number|null} gen - Generation number or null for all
 */
function setGenerationFilter(gen) {
  activeGeneration = gen;
  applyFilters();
}

/**
 * Set a minimum stat value.
 * @param {string} stat - Stat name (hp, attack, defense, spAtk, spDef, speed)
 * @param {number} value - Minimum value
 */
function setMinStat(stat, value) {
  if (stat in minStats) {
    minStats[stat] = Number(value) || 0;
    applyFilters();
  }
}

/**
 * Set sort configuration.
 * @param {string} field - Field to sort by
 * @param {string} direction - 'asc' or 'desc'
 */
function setSort(field, direction) {
  sortConfig.field = field;
  sortConfig.direction = direction || 'asc';
  applyFilters();
}

/**
 * Apply filters with debounce.
 */
function debounceApply() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    applyFilters();
  }, 300);
}

/**
 * Apply all active filters and sorting.
 */
function applyFilters() {
  let results = [...allPokemon];

  // Name search
  if (searchQuery) {
    results = results.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(searchQuery);
      const idMatch = String(p.id).includes(searchQuery);
      const transMatch = p.nameTranslations &&
        Object.values(p.nameTranslations).some(t =>
          t.toLowerCase().includes(searchQuery)
        );
      return nameMatch || idMatch || transMatch;
    });
  }

  // Type filter
  if (activeTypes.length > 0) {
    results = results.filter(p =>
      activeTypes.some(t => p.types.includes(t))
    );
  }

  // Generation filter
  if (activeGeneration) {
    results = results.filter(p => p.generation === activeGeneration);
  }

  // Rarity filter
  if (activeRarities.length > 0) {
    results = results.filter(p =>
      activeRarities.some(r => (p.rarity || '').toLowerCase() === r.toLowerCase())
    );
  }

  // Min stats filter
  const statKeys = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
  for (const key of statKeys) {
    if (minStats[key] > 0) {
      results = results.filter(p => (p.stats[key] || 0) >= minStats[key]);
    }
  }

  // Sort
  results.sort((a, b) => {
    let valA, valB;

    switch (sortConfig.field) {
      case 'name':
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        break;
      case 'hp':
        valA = a.stats.hp;
        valB = b.stats.hp;
        break;
      case 'attack':
        valA = a.stats.attack;
        valB = b.stats.attack;
        break;
      case 'speed':
        valA = a.stats.speed;
        valB = b.stats.speed;
        break;
      case 'id':
      default:
        valA = a.id;
        valB = b.id;
    }

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Update filtered array
  filteredPokemon.length = 0;
  filteredPokemon.push(...results);

  // Sync URL
  syncToURL();

  // Notify
  if (onResultsChange) onResultsChange(results);
}

/**
 * Sync current filters to URL query params.
 */
function syncToURL() {
  const params = new URLSearchParams();
  if (searchQuery) params.set('q', searchQuery);
  if (activeTypes.length > 0) params.set('type', activeTypes.join(','));
  if (activeRarities.length > 0) params.set('rarity', activeRarities.join(','));
  if (activeGeneration) params.set('gen', String(activeGeneration));
  if (sortConfig.field !== 'id' || sortConfig.direction !== 'asc') {
    params.set('sort', `${sortConfig.field}-${sortConfig.direction}`);
  }

  const newURL = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  history.replaceState(null, '', newURL);
}

/**
 * Read filters from URL query params.
 */
function syncFromURL() {
  const params = new URLSearchParams(window.location.search);

  if (params.has('q')) {
    searchQuery = params.get('q') || '';
    const input = document.getElementById('qInput');
    if (input) input.value = searchQuery;
  }

  if (params.has('type')) {
    activeTypes = (params.get('type') || '').split(',').filter(Boolean);
  }

  if (params.has('rarity')) {
    activeRarities = (params.get('rarity') || '').split(',').filter(Boolean);
  }

  if (params.has('gen')) {
    activeGeneration = Number(params.get('gen')) || null;
  }

  if (params.has('sort')) {
    const parts = (params.get('sort') || '').split('-');
    if (parts.length === 2) {
      sortConfig.field = parts[0];
      sortConfig.direction = parts[1];
    }
  }
}

export {
  initSearch,
  setSearchQuery,
  toggleTypeFilter,
  setTypeFilters,
  clearTypeFilters,
  toggleRarityFilter,
  setRarityFilters,
  clearRarityFilters,
  setGenerationFilter,
  setMinStat,
  setSort,
  applyFilters,
  searchQuery,
  activeTypes,
  activeRarities,
  activeGeneration,
  sortConfig,
};
