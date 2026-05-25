/**
 * evolutions.js — Evolution chain data with methods
 *
 * Loads data/evolutions.json and provides functions to
 * get evolution method descriptions between Pokémon.
 */

/** @type {Object|null} Evolution data map: Pokémon ID -> { chain, evolved_from } */
let evoData = null;

/** @type {boolean} Whether evolution data has loaded */
let evoLoaded = false;

/**
 * Load evolution data from JSON file.
 * @returns {Promise<Object>} Evolution data map
 */
async function loadEvolutions() {
  if (evoLoaded) return evoData;

  try {
    const response = await fetch('./data/evolutions.json?cache=' + Date.now());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    evoData = await response.json();
    evoLoaded = true;
    return evoData;
  } catch (err) {
    console.warn('Failed to load evolution data:', err);
    evoData = {};
    evoLoaded = true;
    return evoData;
  }
}

/**
 * Get a human-readable evolution method description between two Pokémon.
 * @param {number} fromId - Previous stage Pokémon ID
 * @param {number} toId - Next stage Pokémon ID
 * @returns {string} Evolution method description (e.g., "Lv.16", "Moon Stone", "Trade")
 */
function getEvoMethod(fromId, toId) {
  if (!evoData) return '?';

  const targetEvo = evoData[String(toId)];
  if (!targetEvo || !targetEvo.evolved_from) {
    return '?';
  }

  const d = targetEvo.evolved_from;
  return formatEvoMethod(d);
}

/**
 * Format evolution details into a short human-readable string.
 * @param {Object} d - Evolution details object
 * @returns {string} Formatted method description
 */
function formatEvoMethod(d) {
  if (!d) return '?';

  switch (d.trigger) {
    case 'level-up':
      if (d.min_level) return `Lv.${d.min_level}`;
      if (d.known_move) return `${d.known_move}`;
      if (d.min_happiness) return `Friendship ≥${d.min_happiness}`;
      if (d.time_of_day === 'day') return 'Daytime';
      if (d.time_of_day === 'night') return 'Nighttime';
      if (d.needs_overworld_rain) return 'Rain';
      return 'Level Up';

    case 'use-item':
    case 'item':
      if (d.item) return d.item;
      if (d.held_item) return `Hold ${d.held_item}`;
      return 'Use Item';

    case 'trade':
      if (d.trade_species) return `Trade for ${d.trade_species}`;
      if (d.held_item) return `Trade w/ ${d.held_item}`;
      return 'Trade';

    case 'friendship':
      if (d.time_of_day === 'day') return 'Friendship (Day)';
      if (d.time_of_day === 'night') return 'Friendship (Night)';
      return 'Friendship';

    case 'shed':
      return 'Shed (Poke Ball)';

    case 'spin':
      return 'Spin & Level';

    case 'tower-of-darkness':
      return 'Tower of Darkness';

    case 'tower-of-waters':
      return 'Tower of Waters';

    case 'three-critical-hits':
      return '3 Critical Hits';

    case 'take-damage':
      return 'Take ≥49 DMG';

    case 'agile-style-move':
      return 'Agile Style Move';

    case 'strong-style-move':
      return 'Strong Style Move';

    case 'recoil-damage':
      return 'Recoil DMG';

    case 'level-up-with-overworld-rain':
      return 'Level Up (Rain)';

    default:
      return d.trigger?.replace(/-/g, ' ') || '?';
  }
}

/**
 * Get evolution chain for a Pokémon ID. Returns array of IDs.
 * @param {number} id - Pokémon ID
 * @returns {number[]} Chain of Pokémon IDs
 */
function getEvoChain(id) {
  if (!evoData) return [id];
  const entry = evoData[String(id)];
  if (entry && entry.chain) return entry.chain;
  return [id];
}

/**
 * Get whether a Pokémon is a baby Pokémon.
 * @param {number} id - Pokémon ID
 * @returns {boolean}
 */
function isBaby(id) {
  if (!evoData) return false;
  const entry = evoData[String(id)];
  return entry?.is_baby || false;
}

export {
  loadEvolutions,
  getEvoMethod,
  formatEvoMethod,
  getEvoChain,
  isBaby,
};
