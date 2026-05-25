/**
 * pokemon-detail.js — Entry point for pokemon.html
 *
 * Handles loading a single Pokémon by `?id=` or `?name=` URL param,
 * rendering the full detail view, and providing navigation.
 */

import { loadPokemonData, getPokemonById, getPokemonByName } from './data.js';
import { toggleFavorite, isFavorite } from './favorites.js';
import { toggleCompare, isInCompare } from './comparator.js';
import { initTheme, toggleTheme } from './theme.js';
import { initI18n, switchLocale, t, getPokemonName, getLocale, updatePageText } from './i18n.js';
import { registerSW } from './pwa.js';
import { loadEvolutions, getEvoMethod } from './evolutions.js';

/* ============================================
   TYPE CHART & CONSTANTS
   ============================================ */
const TC = {
  fire: '#FF6633', water: '#3399FF', grass: '#44BB44',
  electric: '#FFDD00', psychic: '#FF66AA', ice: '#66CCFF',
  dragon: '#7766EE', dark: '#9988AA', fairy: '#FF99CC',
  normal: '#AABB99', fighting: '#BB5533', flying: '#8899FF',
  poison: '#AA5599', ground: '#DDBB55', rock: '#BBAA44',
  bug: '#AABB22', ghost: '#7777BB', steel: '#AAAACC',
};

const CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice: { water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, fighting: 0, poison: 0.5, bug: 0.5, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fighting: 2, poison: 0.5, bug: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

const TYPE_LIST = Object.keys(TC);

/** @type {Object} Current Pokémon data */
let currentPokemon = null;

/** @type {number} Current tab */
let currentTab = 'info';

/* ============================================
   INIT
   ============================================ */
async function init() {
  try {
    await Promise.all([
      loadPokemonData(),
      initI18n(),
      initTheme(),
      loadEvolutions(),
    ]);

    // Update page text after i18n is ready
    updatePageText();

    // Wire up event listeners
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('langToggle')?.addEventListener('click', () => {
      const next = getLocale() === 'pt-BR' ? 'en' : 'pt-BR';
      switchLocale(next);
    });
    document.getElementById('backBtn')?.addEventListener('click', () => {
      window.location.href = './index.html';
    });

    document.getElementById('prevBtn')?.addEventListener('click', navigatePrev);
    document.getElementById('nextBtn')?.addEventListener('click', navigateNext);
    document.getElementById('favBtn')?.addEventListener('click', toggleFav);
    document.getElementById('compBtn')?.addEventListener('click', toggleComp);

    // Register PWA
    registerSW();

    // Parse URL params and load Pokémon
    const params = new URLSearchParams(window.location.search);
    let pokemon = null;

    if (params.has('id')) {
      pokemon = getPokemonById(Number(params.get('id')));
    } else if (params.has('name')) {
      pokemon = getPokemonByName(params.get('name'));
    }

    // Fallback: try hash fragment with id
    if (!pokemon && window.location.hash) {
      const hashId = parseInt(window.location.hash.replace('#', ''));
      if (!isNaN(hashId)) {
        pokemon = getPokemonById(hashId);
      }
    }

    if (pokemon) {
      currentPokemon = pokemon;
      loadPokemon(pokemon);
    } else {
      showError(t('app.errorLoading'));
    }

  } catch (err) {
    console.error('Init error:', err);
    showError('Failed to initialize');
  }
}

/* ============================================
   LOAD POKEMON
   ============================================ */

function loadPokemon(pokemon) {
  currentPokemon = pokemon;
  updateScreen(pokemon);
  renderFullDetail(pokemon);
  updateButtons(pokemon);
  updateURL(pokemon);
}

function updateScreen(pokemon) {
  const sprite = document.getElementById('sSprite');
  const name = document.getElementById('sName');
  const num = document.getElementById('sNum');
  const rarity = document.getElementById('sRarity');

  if (sprite) {
    sprite.src = getSprite3dUrl(pokemon.id);
    sprite.onerror = () => { sprite.src = getSpriteUrl(pokemon.id); };
  }
  if (name) name.textContent = getPokemonName(pokemon).toUpperCase();
  if (num) num.textContent = `#${String(pokemon.id).padStart(3, '0')}`;
  if (rarity) {
    rarity.textContent = (pokemon.rarity || 'UNKNOWN').toUpperCase();
    rarity.className = 's-rarity ' + rarityClass(pokemon.rarity);
  }
}

function updateButtons(pokemon) {
  const favBtn = document.getElementById('favBtn');
  const compBtn = document.getElementById('compBtn');

  if (favBtn) {
    const isFav = isFavorite(pokemon.id);
    favBtn.classList.toggle('on', isFav);
    favBtn.innerHTML = `★ ${isFav ? t('pokemon.favorite') : t('pokemon.favorite')}`;
  }
  if (compBtn) {
    const isComp = isInCompare(pokemon.id);
    compBtn.classList.toggle('on', isComp);
    compBtn.innerHTML = `⚖ ${isComp ? t('pokemon.removeComparator') : t('pokemon.addComparator')}`;
  }
}

function updateURL(pokemon) {
  const url = new URL(window.location);
  url.searchParams.set('id', String(pokemon.id));
  window.history.replaceState(null, '', url);
}

/* ============================================
   RENDER FULL DETAIL
   ============================================ */

function renderFullDetail(pokemon) {
  const panel = document.getElementById('rPanel');
  if (!panel) return;

  const types = pokemon.types;
  const weak = calcWeak(types);
  const weakArr = Object.entries(weak).sort((a, b) => b[1] - a[1]);
  const genLabel = t(`genLabels.${pokemon.generation}`);

  panel.innerHTML = `
    <div class="dh">
      <div class="sprite-box" onclick="cycleDetailSprite(${pokemon.id})">
        <img class="d-sprite img-3d" id="dSprite" src="${getSprite3dUrl(pokemon.id)}" onerror="this.src='${getSpriteUrl(pokemon.id)}'" alt="${pokemon.name}">
        <span class="shiny-tag" id="shinyTag" onclick="event.stopPropagation();toggleShiny(${pokemon.id})">✦</span>
        <span class="cobble-tag">${t('pokemon.cobblemon')}</span>
      </div>
      <div class="dinfo">
        <div class="d-num">#${String(pokemon.id).padStart(3, '0')} · ${genLabel}</div>
        <div class="d-name">${getPokemonName(pokemon).toUpperCase()}</div>
        <div class="types-row">
          ${types.map(t => `<span class="tbadge" style="color:${TC[t.toLowerCase()]};border-color:${TC[t.toLowerCase()]}">${t.toUpperCase()}</span>`).join('')}
        </div>
        <div class="meta-grid">
          <div class="mi"><div class="mk">${t('pokemon.height')}</div><div class="mv">${pokemon.height}m</div></div>
          <div class="mi"><div class="mk">${t('pokemon.weight')}</div><div class="mv">${pokemon.weight}kg</div></div>
          <div class="mi"><div class="mk">${t('pokemon.rarity')}</div><div class="mv" style="font-size:10px;color:${rarityColor(pokemon.rarity)}">${(pokemon.rarity || '?').toUpperCase()}</div></div>
          <div class="mi"><div class="mk">${t('pokemon.catchRate')}</div><div class="mv">${calcCatchPercent(pokemon.catchRate)}%<div class="cbar"><div class="cfill" style="width:${calcCatchPercent(pokemon.catchRate)}%"></div></div></div></div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <div class="tab${currentTab === 'info' ? ' on' : ''}" onclick="window.switchTab('info')">${t('tabs.info')}</div>
      <div class="tab${currentTab === 'spawn' ? ' on' : ''}" onclick="window.switchTab('spawn')">${t('tabs.spawn')}</div>
      <div class="tab${currentTab === 'drops' ? ' on' : ''}" onclick="window.switchTab('drops')">${t('tabs.drops')}</div>
      <div class="tab${currentTab === 'stats' ? ' on' : ''}" onclick="window.switchTab('stats')">${t('tabs.stats')}</div>
      <div class="tab${currentTab === 'weakness' ? ' on' : ''}" onclick="window.switchTab('weakness')">${t('tabs.weakness')}</div>
      <div class="tab${currentTab === 'evo' ? ' on' : ''}" onclick="window.switchTab('evo')">${t('tabs.evo')}</div>
      <div class="tab${currentTab === 'breed' ? ' on' : ''}" onclick="window.switchTab('breed')">${t('tabs.breed')}</div>
    </div>

    <div class="tc${currentTab === 'info' ? ' on' : ''}" id="t-info">
      <div class="sh">${t('info.pokedexEntry')}</div>
      <div class="lore">${getDescription(pokemon)}</div>
      <div class="sh">${t('info.abilities')}</div>
      <div class="ab-grid">
        ${(pokemon.abilities || []).map(a =>
          `<div class="ab-card"><div class="ab-name">${a.replace(/-/g, ' ')}</div></div>`
        ).join('')}
      </div>
      <div class="sh">${t('info.baseStatsOverview')}</div>
      <div class="stats">${renderStatsHTML(pokemon.stats)}</div>
    </div>

    <div class="tc${currentTab === 'spawn' ? ' on' : ''}" id="t-spawn">
      <div class="sh">${t('spawn.spawnConditions')}</div>
      <div class="spawn-list">
        <div class="spawn-card">
          <div style="font-size:7px;color:var(--cyan);letter-spacing:1px;margin-bottom:5px">${t('spawn.wildSpawn')}</div>
          <div class="spawn-row">
            <span class="spawn-tag ctx">${pokemon.context || 'Grounded'}</span>
            <span class="spawn-tag time">⏰ ${pokemon.time || 'Any'}</span>
            <span class="spawn-tag weather">☁ ${pokemon.weather || 'Any'}</span>
            <span class="spawn-tag" style="color:var(--gold);border-color:#AA880044">LVL ${pokemon.levels || '?'}</span>
          </div>
          <div style="margin-top:8px;font-size:6px;color:var(--dim);letter-spacing:1px">${t('spawn.biomes')}</div>
          <div class="spawn-row" style="margin-top:4px">
            ${(pokemon.biomes || []).map(b => `<span class="spawn-tag biome">${b.replace(/_/g, ' ')}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="sh">${t('spawn.herdBehavior')}</div>
      <div class="beh-list">
        <div class="beh-row"><span class="beh-k">${t('spawn.maxHerdSize')}</span><span class="beh-v">4</span></div>
        <div class="beh-row"><span class="beh-k">${t('spawn.walkSpeed')}</span><span class="beh-v">0.27</span></div>
        <div class="beh-row"><span class="beh-k">${t('spawn.avoidsWater')}</span><span class="beh-v">${types.includes('Water') || types.includes('water') ? t('spawn.no') : t('spawn.yes')}</span></div>
        <div class="beh-row"><span class="beh-k">${t('spawn.willDefend')}</span><span class="beh-v">${t('spawn.yes')}</span></div>
        <div class="beh-row"><span class="beh-k">${t('spawn.canSleep')}</span><span class="beh-v">${t('spawn.yes')}</span></div>
      </div>
    </div>

    <div class="tc${currentTab === 'drops' ? ' on' : ''}" id="t-drops">
      <div class="sh">${t('drops.cobblemonDrops')}</div>
      <div class="drop-list">
        ${(pokemon.drops && pokemon.drops.length ? pokemon.drops : [t('app.noSpecificDrops')]).map(d => `
          <div class="drop-row">
            <div class="drop-icon">⬥</div>
            <div class="drop-name">${d.replace(/(\d)/, '').trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</div>
            <div class="drop-amt">${(d.match(/[\d%\-]+/g) || [''])[0]}</div>
          </div>`).join('')}
      </div>
    </div>

    <div class="tc${currentTab === 'stats' ? ' on' : ''}" id="t-stats">
      <div class="sh">${t('stats.baseStats')}</div>
      <div class="stats">${renderStatsHTML(pokemon.stats, true)}</div>
      <div class="sh">${t('stats.trainingData')}</div>
      <div class="meta-grid" style="margin-top:4px">
        <div class="mi"><div class="mk">${t('stats.catchRate')}</div><div class="mv">${pokemon.catchRate || '?'}</div></div>
        <div class="mi"><div class="mk">${t('stats.friendship')}</div><div class="mv">${pokemon.baseHappiness || 0}</div></div>
        <div class="mi"><div class="mk">${t('stats.growthRate')}</div><div class="mv" style="font-size:9px">${(pokemon.growthRate || '?').replace(/-/g, ' ').toUpperCase()}</div></div>
        <div class="mi"><div class="mk">${t('stats.eggCycles')}</div><div class="mv">${pokemon.hatchCounter || '?'}</div></div>
        <div class="mi"><div class="mk">${t('stats.baseExp')}</div><div class="mv">${pokemon.baseExp || '?'}</div></div>
      </div>
    </div>

    <div class="tc${currentTab === 'weakness' ? ' on' : ''}" id="t-weakness">
      <div class="sh">${t('weakness.typeChart')} ${types.map(t => t.toUpperCase()).join(' / ')}</div>
      <div class="wgrid">
        ${weakArr.map(([type, mult]) => `
          <div class="wrow">
            <span class="mt" style="color:${TC[type.toLowerCase()] || '#AAA'};border-color:${TC[type.toLowerCase()] || '#555'}">${type.toUpperCase()}</span>
            <span class="wmult ${mult >= 4 ? 'w4' : mult >= 2 ? 'w2' : mult <= 0 ? 'w0' : 'w05'}">${mult}×</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="tc${currentTab === 'evo' ? ' on' : ''}" id="t-evo">
      <div class="sh">${t('evo.evolutionChain')}</div>
      <div id="evoBox">
        ${renderEvolutionChain(pokemon)}
      </div>
    </div>

    <div class="tc${currentTab === 'breed' ? ' on' : ''}" id="t-breed">
      <div class="sh">${t('breed.breedingData')}</div>
      <div class="meta-grid" style="margin-top:4px">
        <div class="mi"><div class="mk">${t('breed.eggGroups')}</div><div class="mv" style="font-size:10px">${(pokemon.eggGroups || ['?']).join(', ')}</div></div>
        <div class="mi"><div class="mk">${t('breed.hatchSteps')}</div><div class="mv">${pokemon.hatchCounter ? pokemon.hatchCounter * 257 : 0}</div></div>
        <div class="mi"><div class="mk">${t('breed.genderRatio')}</div><div class="mv" style="font-size:9px">${pokemon.genderRate < 0 ? t('breed.genderless') : Math.round(pokemon.genderRate / 8 * 100) + '% F'}</div></div>
        <div class="mi"><div class="mk">${t('breed.eggCycles')}</div><div class="mv">${pokemon.hatchCounter || '?'}</div></div>
      </div>
    </div>
  `;
}

/* ============================================
   NAVIGATION
   ============================================ */

function navigatePrev() {
  if (!currentPokemon) return;
  const prevId = currentPokemon.id - 1;
  const pokemon = getPokemonById(prevId);
  if (pokemon) loadPokemon(pokemon);
}

function navigateNext() {
  if (!currentPokemon) return;
  const nextId = currentPokemon.id + 1;
  const pokemon = getPokemonById(nextId);
  if (pokemon) loadPokemon(pokemon);
}

/* ============================================
   FAVORITES & COMPARE
   ============================================ */

function toggleFav() {
  if (!currentPokemon) return;
  toggleFavorite(currentPokemon.id);
  updateButtons(currentPokemon);
}

function toggleComp() {
  if (!currentPokemon) return;
  toggleCompare(currentPokemon.id);
  updateButtons(currentPokemon);
}

/* ============================================
   HELPERS
   ============================================ */

function renderStatsHTML(stats) {
  const names = { hp: 'HP', attack: 'ATK', defense: 'DEF', spAtk: 'SP.ATK', spDef: 'SP.DEF', speed: 'SPD' };
  const cols = { hp: '#FF4444', attack: '#FF8833', defense: '#FFDD00', spAtk: '#8888FF', spDef: '#44AAFF', speed: '#44FF88' };
  return Object.keys(stats).map(key => {
    const val = stats[key];
    const pct = Math.min(100, Math.round(val / 255 * 100));
    return `<div class="srow">
      <div class="sn">${names[key] || key.toUpperCase()}</div>
      <div class="sv">${val}</div>
      <div class="sbar"><div class="sfill" style="width:${pct}%;background:${cols[key] || '#44CCFF'}"></div></div>
    </div>`;
  }).join('');
}

function renderEvolutionChain(pokemon) {
  if (!pokemon.evolutionChain || pokemon.evolutionChain.length <= 1) {
    return '<div style="font-size:9px;color:var(--dim);text-align:center">No evolution</div>';
  }

  let html = '<div class="evo-chain">';
  pokemon.evolutionChain.forEach((evoId, i) => {
    const isCurrent = evoId === pokemon.id;
    const evoPoke = getPokemonById(evoId);
    const evoName = evoPoke ? getPokemonName(evoPoke) : '?';
    html += `<div class="evo-step${isCurrent ? ' cur' : ''}" onclick="window.navigateTo(${evoId})">
      <img class="evo-img" src="${getSprite3dUrl(evoId)}" onerror="this.src='${getSpriteUrl(evoId)}'" alt="">
      <div class="evo-nm">${evoName}</div>
      <div class="evo-id">#${String(evoId).padStart(3, '0')}</div>
    </div>`;
    if (i < pokemon.evolutionChain.length - 1) {
      const nextId = pokemon.evolutionChain[i + 1];
      const method = getEvoMethod(evoId, nextId);
      html += `<div class="evo-arr"><span>→</span><div class="evo-meth">${method}</div></div>`;
    }
  });
  html += '</div>';
  return html;
}

function calcWeak(types) {
  const r = {};
  TYPE_LIST.forEach(atk => {
    let m = 1;
    types.forEach(def => {
      const c = CHART[atk] || {};
      if (c[def.toLowerCase()] !== undefined) m *= c[def.toLowerCase()];
    });
    if (m !== 1) r[atk] = m;
  });
  return r;
}

function calcCatchPercent(rate) {
  if (!rate) return 0;
  return Math.round(rate / 255 * 100);
}

function getSpriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getSprite3dUrl(id) {
  return `https://cobbledex.b-cdn.net/3dmons/previews/large/${id}.webp`;
}

function getDescription(pokemon) {
  if (pokemon.description) {
    const locale = getLocale();
    if (pokemon.description[locale]) return pokemon.description[locale];
    if (pokemon.description.en) return pokemon.description.en;
  }
  return 'No description available.';
}

function rarityClass(r) {
  if (!r) return '';
  const low = r.toLowerCase();
  if (low.includes('legendary')) return 'rarity-legendary';
  if (low.includes('ultra')) return 'rarity-ultra-rare';
  if (low.includes('rare')) return 'rarity-rare';
  if (low.includes('uncommon')) return 'rarity-uncommon';
  return 'rarity-common';
}

function rarityColor(r) {
  if (!r) return '#AAAAAA';
  const low = r.toLowerCase();
  if (low.includes('legendary')) return '#FF4444';
  if (low.includes('ultra')) return '#FFD700';
  if (low.includes('rare')) return '#FF88FF';
  if (low.includes('uncommon')) return '#88AAFF';
  return '#88FF88';
}

function showError(msg) {
  const panel = document.getElementById('rPanel');
  if (panel) {
    panel.innerHTML = `<div class="loading" style="color:#FF5555;font-size:7px">${msg}</div>`;
  }
}

let isShiny = false;

/* ============================================
   GLOBALS (exposed for onclick)
   ============================================ */

window.switchTab = (tab) => {
  currentTab = tab;
  if (currentPokemon) renderFullDetail(currentPokemon);
};

window.navigateTo = (id) => {
  const pokemon = getPokemonById(id);
  if (pokemon) loadPokemon(pokemon);
};

window.cycleDetailSprite = (id) => {
  const sprite = document.getElementById('dSprite');
  if (!sprite) return;
  const baseUrl = getSpriteUrl(id);
  if (sprite.src.includes('cobbledex') || sprite.src.includes('b-cdn')) {
    sprite.src = baseUrl;
  } else {
    sprite.src = getSprite3dUrl(id);
    sprite.onerror = () => { sprite.src = baseUrl; };
  }
};

window.toggleShiny = (id) => {
  isShiny = !isShiny;
  const s = document.getElementById('dSprite');
  const ss = document.getElementById('sSprite');
  const t = document.getElementById('shinyTag');
  const shinyUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
  if (s) {
    s.src = isShiny ? shinyUrl : getSprite3dUrl(id);
    s.onerror = function () { this.src = isShiny ? shinyUrl : getSpriteUrl(id); };
  }
  if (ss) {
    ss.src = isShiny ? shinyUrl : getSprite3dUrl(id);
    ss.onerror = function () { this.src = getSpriteUrl(id); };
  }
  if (t) t.classList.toggle('on', isShiny);
};

// Boot
document.addEventListener('DOMContentLoaded', init);
