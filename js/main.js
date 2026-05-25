/**
 * main.js — Entry point for index.html
 *
 * Initializes all modules and wires up the UI for the main Pokédex page.
 */

import { loadPokemonData, getPokemonById, filteredPokemon, allPokemon } from './data.js';
import { loadEvolutions, getEvoMethod } from './evolutions.js';
import { initSearch, setSearchQuery, toggleTypeFilter, toggleRarityFilter, setGenerationFilter, setMinStat, setSort, applyFilters, clearRarityFilters, activeTypes, activeRarities } from './search.js';
import { toggleFavorite, isFavorite, getFavorites, onFavoritesChange } from './favorites.js';
import { toggleCompare, isInCompare, openComparison, updateFAB } from './comparator.js';
import { initTheme, toggleTheme } from './theme.js';
import { initI18n, switchLocale, t, getPokemonName, getLocale, updatePageText } from './i18n.js';
import { registerSW } from './pwa.js';

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
const GEN_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/* ============================================
   STATE
   ============================================ */
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
    ]);

    buildTypeFilters();
    buildRarityFilters();
    buildGenerationFilters();
    buildSortControls();
    buildStatFilters();
    loadEvolutions();

    initSearch((results) => {
      renderList(results);
    });

    applyFilters();
    updateFAB();

    // Register PWA
    registerSW();

    // Wire up event listeners
    document.getElementById('qInput')?.addEventListener('input', (e) => {
      setSearchQuery(e.target.value);
    });

    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('langToggle')?.addEventListener('click', () => {
      const next = getLocale() === 'pt-BR' ? 'en' : 'pt-BR';
      switchLocale(next);
    });

    // Favorites header button
    document.getElementById('favHeaderBtn')?.addEventListener('click', () => {
      setSearchQuery('');
      clearFilters();
      showFavoritesFilter();
    });

    // Comparator FAB
    document.getElementById('comparatorFAB')?.addEventListener('click', openComparison);

    // Listen for favorite changes to update list
    onFavoritesChange(() => {
      if (document.querySelector('.fav-filter-active')) {
        applyFilters();
      }
    });

  } catch (err) {
    console.error('Init error:', err);
    showError('Failed to initialize Cobbledex');
  }
}

/* ============================================
   BUILD UI
   ============================================ */

function buildTypeFilters() {
  const grid = document.getElementById('typeGrid');
  if (!grid) return;

  TYPE_LIST.forEach(type => {
    const btn = document.createElement('button');
    btn.className = 'tbtn';
    btn.style.color = TC[type];
    btn.style.borderColor = TC[type];
    btn.textContent = type.toUpperCase();
    btn.dataset.type = type;
    btn.addEventListener('click', () => {
      toggleTypeFilter(type);
      btn.classList.toggle('on');
      updateTypeUI();
    });
    grid.appendChild(btn);
  });
}

function updateTypeUI() {
  document.querySelectorAll('.tbtn').forEach(btn => {
    const type = btn.dataset.type;
    btn.classList.toggle('on', activeTypes?.includes(type));
  });
}

function buildRarityFilters() {
  const grid = document.getElementById('rarityGrid');
  if (!grid) return;

  const rarities = [
    { rarity: 'Common', color: '#88FF88', border: '#44AA44' },
    { rarity: 'Uncommon', color: '#88AAFF', border: '#4466AA' },
    { rarity: 'Rare', color: '#FF88FF', border: '#AA44AA' },
    { rarity: 'Ultra Rare', color: '#FFD700', border: '#AA8800' },
    { rarity: 'Legendary', color: '#FF4444', border: '#AA0000' },
    { rarity: 'Mythical', color: '#FF8844', border: '#AA4400' },
  ];

  rarities.forEach(({ rarity, color, border }) => {
    const btn = document.createElement('button');
    btn.className = 'rbtn';
    btn.style.color = color;
    btn.style.borderColor = border;
    btn.textContent = rarity.toUpperCase();
    btn.dataset.rarity = rarity;
    btn.addEventListener('click', () => {
      toggleRarityFilter(rarity);
      btn.classList.toggle('on');
      updateRarityUI();
    });
    grid.appendChild(btn);
  });
}

function updateRarityUI() {
  document.querySelectorAll('.rbtn').forEach(btn => {
    const rarity = btn.dataset.rarity;
    btn.classList.toggle('on', activeRarities?.includes(rarity));
  });
}

function buildGenerationFilters() {
  const grid = document.getElementById('genGrid');
  if (!grid) return;

  GEN_LIST.forEach(gen => {
    const btn = document.createElement('button');
    btn.className = 'gbtn';
    btn.textContent = `Gen ${gen}`;
    btn.dataset.gen = gen;
    btn.addEventListener('click', () => {
      const isActive = btn.classList.contains('on');
      document.querySelectorAll('.gbtn').forEach(b => b.classList.remove('on'));
      if (!isActive) {
        btn.classList.add('on');
        setGenerationFilter(gen);
      } else {
        setGenerationFilter(null);
      }
    });
    grid.appendChild(btn);
  });
}

function buildSortControls() {
  const container = document.getElementById('sortControls');
  if (!container) return;

  const fields = [
    { field: 'id', label: '#' },
    { field: 'name', label: 'Name' },
    { field: 'hp', label: 'HP' },
    { field: 'attack', label: 'ATK' },
    { field: 'speed', label: 'SPD' },
  ];

  fields.forEach(({ field, label }) => {
    const btn = document.createElement('button');
    btn.className = 'sort-btn';
    btn.textContent = label;
    btn.dataset.field = field;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const dir = btn.dataset.dir === 'asc' ? 'desc' : 'asc';
      btn.dataset.dir = dir;
      btn.innerHTML = `${label} <span class="sort-dir">${dir === 'asc' ? '↑' : '↓'}</span>`;
      setSort(field, dir);
    });
    container.appendChild(btn);
  });

  // Default: sort by #
  const defaultBtn = container.querySelector('[data-field="id"]');
  if (defaultBtn) {
    defaultBtn.classList.add('on');
    defaultBtn.dataset.dir = 'asc';
    defaultBtn.innerHTML = '# <span class="sort-dir">↑</span>';
  }
}

function buildStatFilters() {
  const container = document.getElementById('statFilters');
  if (!container) return;

  const stats = [
    { key: 'hp', label: 'HP' },
    { key: 'attack', label: 'ATK' },
    { key: 'defense', label: 'DEF' },
    { key: 'spAtk', label: 'SPA' },
    { key: 'spDef', label: 'SPD' },
    { key: 'speed', label: 'SPE' },
  ];

  stats.forEach(({ key, label }) => {
    const item = document.createElement('div');
    item.className = 'range-item';
    item.innerHTML = `
      <span>${label}</span>
      <input type="number" id="minStat_${key}" min="0" max="255" value="0" data-stat="${key}">
    `;
    container.appendChild(item);

    const input = item.querySelector('input');
    input.addEventListener('input', () => {
      setMinStat(key, input.value);
    });
  });
}

function clearFilters() {
  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.rbtn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.gbtn').forEach(b => b.classList.remove('on'));
  document.querySelectorAll('.sort-btn').forEach(b => {
    b.classList.remove('on');
    b.dataset.dir = 'asc';
    b.innerHTML = b.textContent.trim();
  });
  document.querySelectorAll('.range-item input').forEach(i => i.value = '0');
  document.querySelector('.fav-filter-active')?.classList.remove('fav-filter-active');
  clearRarityFilters();
  setGenerationFilter(null);
  setSort('id', 'asc');
  // Restore default sort button
  const defaultBtn = document.querySelector('[data-field="id"]');
  if (defaultBtn) {
    defaultBtn.classList.add('on');
    defaultBtn.dataset.dir = 'asc';
    defaultBtn.innerHTML = '# <span class="sort-dir">↑</span>';
  }
}

function showFavoritesFilter() {
  const favIds = getFavorites();
  const results = allPokemon.filter(p => favIds.includes(p.id));
  renderList(results);
  // Add indicator that favorites filter is active
  document.querySelector('.fav-header-btn')?.classList.add('fav-filter-active');
}

/* ============================================
   RENDER LIST
   ============================================ */

function renderList(results) {
  const list = document.getElementById('pList');
  if (!list) return;

  if (results.length === 0) {
    list.innerHTML = '<div class="empty"><div style="font-size:32px">⊕</div><div>NO RESULTS FOUND</div></div>';
    return;
  }

  list.innerHTML = '';
  results.forEach(p => {
    const div = document.createElement('div');
    div.className = 'pitem';
    div.dataset.id = p.id;
    div.innerHTML = `
      <img class="li-img" src="${getSpriteUrl(p.id)}" alt="${p.name}" loading="lazy">
      <div class="li-info">
        <div class="li-n">#${String(p.id).padStart(3, '0')}</div>
        <div class="li-name">${getPokemonName(p)}</div>
      </div>
      <div class="li-types">
        ${p.types.map(t => `<span class="mt" style="color:${TC[t.toLowerCase()] || '#AAA'};border-color:${TC[t.toLowerCase()] || '#555'}">${t.slice(0, 3).toUpperCase()}</span>`).join('')}
      </div>
    `;
    div.addEventListener('click', () => selectPokemon(p.id));
    list.appendChild(div);
  });
}

/* ============================================
   SELECT POKEMON
   ============================================ */

async function selectPokemon(id) {
  // Update list highlight
  document.querySelectorAll('.pitem').forEach(i => {
    i.classList.toggle('sel', Number(i.dataset.id) === id);
  });

  // Update left screen
  const pokemon = getPokemonById(id);
  if (!pokemon) return;

  updateScreen(pokemon);
  renderDetail(pokemon);
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

function renderDetail(pokemon) {
  const panel = document.getElementById('rPanel');
  if (!panel) return;

  const types = pokemon.types;
  const isFav = isFavorite(pokemon.id);
  const isComp = isInCompare(pokemon.id);
  const weak = calcWeak(types);
  const weakArr = Object.entries(weak).sort((a, b) => b[1] - a[1]);

  const genLabel = t(`genLabels.${pokemon.generation}`);

  panel.innerHTML = `
    <div class="dh">
      <div class="sprite-box" onclick="cycleDetailSprite(${pokemon.id})">
        <img class="d-sprite img-3d" id="dSprite" src="${getSprite3dUrl(pokemon.id)}" onerror="this.src='${getSpriteUrl(pokemon.id)}'" alt="${pokemon.name}">
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
        <div class="detail-actions" style="margin-top:8px">
          <button class="fav-btn${isFav ? ' on' : ''}" id="favBtn" onclick="window.toggleFav(${pokemon.id})">★ ${isFav ? 'FAV' : 'FAV'}</button>
          <button class="specs-btn${isComp ? ' on' : ''}" id="compBtn" onclick="window.toggleComp(${pokemon.id})">⚖ ${isComp ? 'IN COMPARE' : 'COMPARE'}</button>
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
        <div class="beh-row"><span class="beh-k">${t('spawn.avoidsWater')}</span><span class="beh-v">${types.includes('water') ? t('spawn.no') : t('spawn.yes')}</span></div>
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
   HELPERS
   ============================================ */

function renderStatsHTML(stats, full) {
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
    html += `<div class="evo-step${isCurrent ? ' cur' : ''}" onclick="window.selectPoke(${evoId})">
      <img class="evo-img" src="${getSprite3dUrl(evoId)}" onerror="this.src='${getSpriteUrl(evoId)}'" alt="">
      <div class="evo-nm">${getPokemonName(getPokemonById(evoId) || { name: '?', nameTranslations: {} })}</div>
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

/* ============================================
   GLOBALS (exposed for onclick)
   ============================================ */

window.switchTab = (tab) => {
  currentTab = tab;
  const selected = document.querySelector('.sel');
  if (selected) {
    const id = Number(selected.dataset.id);
    const pokemon = getPokemonById(id);
    if (pokemon) renderDetail(pokemon);
  }
};

window.toggleFav = (id) => {
  toggleFavorite(id);
  const isFav = isFavorite(id);
  const btn = document.getElementById('favBtn');
  if (btn) btn.classList.toggle('on', isFav);
};

window.toggleComp = (id) => {
  toggleCompare(id);
  const isComp = isInCompare(id);
  const btn = document.getElementById('compBtn');
  if (btn) btn.classList.toggle('on', isComp);
};

window.selectPoke = (id) => {
  const pokemon = getPokemonById(id);
  if (pokemon) {
    document.querySelectorAll('.pitem').forEach(i => {
      i.classList.toggle('sel', Number(i.dataset.id) === id);
    });
    updateScreen(pokemon);
    renderDetail(pokemon);
  }
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

// Expose functions for inline onclick
window.clearRarityFilters = clearRarityFilters;

// Boot
document.addEventListener('DOMContentLoaded', init);
