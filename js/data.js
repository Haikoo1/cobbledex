/**
 * data.js — Pokémon data loading and shared state
 *
 * Loads pokemon.json and provides a central data store
 * that all other modules can import.
 */

/** @type {Array} All Pokémon loaded from pokemon.json */
let allPokemon = [];

/** @type {Array} Currently filtered/paginated Pokémon list */
let filteredPokemon = [];

/** @type {Object|null} Currently selected Pokémon full data */
let selectedPokemon = null;

/** @type {boolean} Whether data has finished loading */
let dataLoaded = false;

/** @type {Array} Resolved callbacks waiting for data */
const loadWaiters = [];

/**
 * Load all Pokémon data from the JSON file.
 * @returns {Promise<Array>} The full Pokémon array
 */
async function loadPokemonData() {
  if (dataLoaded) return allPokemon;

  try {
    const response = await fetch('./data/pokemon.json?cache=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    allPokemon = await response.json();
    filteredPokemon = [...allPokemon];
    dataLoaded = true;
    loadWaiters.forEach(fn => fn(allPokemon));
    return allPokemon;
  } catch (err) {
    console.error('Failed to load pokemon data:', err);
    throw err;
  }
}

/**
 * Get a Pokémon by its ID.
 * @param {number} id - Pokémon ID
 * @returns {Object|undefined} The Pokémon object or undefined
 */
function getPokemonById(id) {
  return allPokemon.find(p => p.id === Number(id));
}

/**
 * Get a Pokémon by its name (case-insensitive).
 * @param {string} name - Pokémon name
 * @returns {Object|undefined} The Pokémon object or undefined
 */
function getPokemonByName(name) {
  return allPokemon.find(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Wait until data is loaded, then run a callback.
 * @param {Function} callback - Function to run with data array
 */
function onDataReady(callback) {
  if (dataLoaded) {
    callback(allPokemon);
  } else {
    loadWaiters.push(callback);
  }
}

export {
  allPokemon,
  filteredPokemon,
  selectedPokemon,
  dataLoaded,
  loadPokemonData,
  getPokemonById,
  getPokemonByName,
  onDataReady,
};
