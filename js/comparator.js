/**
 * comparator.js — Compare up to 3 Pokémon side-by-side
 *
 * Features:
 * - Select/deselect Pokémon for comparison
 * - Floating action button when items selected
 * - Modal with stat table
 * - Highest stat highlighted per row
 */

import { getPokemonById } from './data.js';

const MAX_COMPARE = 3;

/** @type {Array<number>} Currently selected Pokémon IDs for comparison */
let compareList = [];

/** @type {Array<Function>} Change listeners */
let listeners = [];

/**
 * Toggle a Pokémon in the comparison list.
 * @param {number} id - Pokémon ID
 * @returns {boolean} Whether the Pokémon is now in the list
 */
function toggleCompare(id) {
  const idx = compareList.indexOf(id);
  if (idx >= 0) {
    compareList.splice(idx, 1);
    notifyListeners();
    return false;
  }
  if (compareList.length >= MAX_COMPARE) {
    return false;
  }
  compareList.push(id);
  notifyListeners();
  return true;
}

/**
 * Remove a Pokémon from the compare list.
 * @param {number} id - Pokémon ID
 */
function removeCompare(id) {
  const idx = compareList.indexOf(id);
  if (idx >= 0) {
    compareList.splice(idx, 1);
    notifyListeners();
  }
}

/**
 * Clear the entire compare list.
 */
function clearCompare() {
  compareList = [];
  notifyListeners();
}

/**
 * Check if a Pokémon is in the compare list.
 * @param {number} id - Pokémon ID
 * @returns {boolean}
 */
function isInCompare(id) {
  return compareList.includes(id);
}

/**
 * Get the current compare list.
 * @returns {Array<number>} Array of Pokémon IDs
 */
function getCompareList() {
  return [...compareList];
}

/**
 * Build the comparison table HTML.
 * @returns {string} HTML for the comparison modal
 */
function buildComparisonHTML() {
  const pokemon = compareList
    .map(id => getPokemonById(id))
    .filter(Boolean);

  if (pokemon.length === 0) {
    return '<div class="empty"><div>No Pokémon selected for comparison</div></div>';
  }

  const statKeys = ['hp', 'attack', 'defense', 'spAtk', 'spDef', 'speed'];
  const statLabels = { hp: 'HP', attack: 'ATK', defense: 'DEF', spAtk: 'SP.ATK', spDef: 'SP.DEF', speed: 'SPD' };

  let html = `
    <div class="comparator-modal">
      <button class="comparator-close" onclick="comparatorClose()">✕ CLOSE</button>
      <div class="sh">COMPARISON</div>
      <table class="comparator-table">
        <thead>
          <tr>
            <th>STAT</th>
            ${pokemon.map(p => `<th>${p.name}<br><span style="font-size:9px;color:var(--dim)">#${String(p.id).padStart(3, '0')}</span></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;color:var(--cyan)">TYPES</td>
            ${pokemon.map(p => `<td>${p.types.map(t => `<span class="mt" style="color:var(--type-${t.toLowerCase()});border-color:var(--type-${t.toLowerCase()})">${t}</span>`).join(' ')}</td>`).join('')}
          </tr>
          ${statKeys.map(key => {
            const values = pokemon.map(p => p.stats[key] || 0);
            const maxVal = Math.max(...values);
            return `<tr>
              <td style="font-weight:bold;color:var(--dim)">${statLabels[key]}</td>
              ${values.map(v => `<td class="${v === maxVal ? 'highest' : ''}">${v}</td>`).join('')}
            </tr>`;
          }).join('')}
          <tr>
            <td style="font-weight:bold;color:var(--dim)">TOTAL</td>
            ${pokemon.map(p => {
              const total = statKeys.reduce((sum, k) => sum + (p.stats[k] || 0), 0);
              return `<td style="font-weight:bold">${total}</td>`;
            }).join('')}
          </tr>
          <tr>
            <td style="font-weight:bold;color:var(--dim)">HEIGHT</td>
            ${pokemon.map(p => `<td>${p.height}m</td>`).join('')}
          </tr>
          <tr>
            <td style="font-weight:bold;color:var(--dim)">WEIGHT</td>
            ${pokemon.map(p => `<td>${p.weight}kg</td>`).join('')}
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return html;
}

/**
 * Open the comparison modal.
 */
function openComparison() {
  const existing = document.querySelector('.comparator-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'comparator-overlay open';
  overlay.innerHTML = buildComparisonHTML();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeComparison();
  });
  document.body.appendChild(overlay);
}

/**
 * Close the comparison modal.
 */
function closeComparison() {
  const overlay = document.querySelector('.comparator-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  }
}

/**
 * Update the FAB visibility and text.
 */
function updateFAB() {
  const fab = document.getElementById('comparatorFAB');
  if (!fab) return;

  if (compareList.length > 0) {
    fab.classList.add('visible');
    fab.textContent = `⚖ Compare ${compareList.length} Pokémon`;
  } else {
    fab.classList.remove('visible');
  }
}

/**
 * Subscribe to compare list changes.
 * @param {Function} listener
 */
function onCompareChange(listener) {
  listeners.push(listener);
}

/**
 * Notify all listeners.
 */
function notifyListeners() {
  updateFAB();
  listeners.forEach(fn => fn([...compareList]));
}

// Expose close function globally for onclick
window.comparatorClose = closeComparison;

export {
  toggleCompare,
  removeCompare,
  clearCompare,
  isInCompare,
  getCompareList,
  openComparison,
  closeComparison,
  updateFAB,
  onCompareChange,
  MAX_COMPARE,
};
