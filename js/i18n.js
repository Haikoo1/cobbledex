/**
 * i18n.js — Internationalization (pt-BR / en)
 *
 * Features:
 * - Load locale JSON files from /locales/
 * - Language selector in header
 * - Preference saved in localStorage
 * - Translates Pokémon names and descriptions when available
 * - Falls back to 'en' for missing keys
 */

const LOCALE_KEY = 'cobblemon-locale';
const SUPPORTED_LOCALES = ['pt-BR', 'en'];

/** @type {string} Current locale code */
let currentLocale = 'en';

/** @type {Object} Loaded translations for current locale */
let translations = {};

/** @type {Array<Function>} Language change listeners */
let listeners = [];

/**
 * Initialize i18n from localStorage or browser default.
 */
async function initI18n() {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored)) {
    currentLocale = stored;
  } else {
    const browserLang = navigator.language || 'en';
    currentLocale = browserLang.startsWith('pt') ? 'pt-BR' : 'en';
  }

  await loadLocale(currentLocale);
}

/**
 * Load a locale file.
 * @param {string} locale - Locale code (e.g., 'pt-BR', 'en')
 * @returns {Promise<Object>} Translation object
 */
async function loadLocale(locale) {
  try {
    const response = await fetch(`./locales/${locale}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    translations = await response.json();
    currentLocale = locale;
    localStorage.setItem(LOCALE_KEY, locale);
    notifyListeners();
    return translations;
  } catch (err) {
    console.error(`Failed to load locale ${locale}:`, err);
    // Fall back to English
    if (locale !== 'en') {
      return loadLocale('en');
    }
    translations = {};
    return translations;
  }
}

/**
 * Switch to a different locale.
 * @param {string} locale - Locale code
 */
async function switchLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  await loadLocale(locale);
  updatePageText();
}

/**
 * Translate a key from the current locale.
 * Supports dot notation (e.g., "app.title", "pokemon.height").
 * @param {string} key - Translation key
 * @param {Object} [params] - Optional interpolation params
 * @returns {string} Translated text
 */
function t(key, params) {
  const parts = key.split('.');
  let value = translations;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      // Key not found, return the key itself
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Simple interpolation: {{param}}
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] ?? `{{${p}}}`);
  }

  return value;
}

/**
 * Get a Pokémon's translated name.
 * @param {Object} pokemon - Pokémon object
 * @returns {string} Translated name
 */
function getPokemonName(pokemon) {
  if (pokemon.nameTranslations && pokemon.nameTranslations[currentLocale]) {
    return pokemon.nameTranslations[currentLocale];
  }
  return pokemon.name;
}

/**
 * Get a Pokémon's translated description.
 * @param {Object} pokemon - Pokémon object
 * @returns {string} Translated description
 */
function getPokemonDescription(pokemon) {
  if (pokemon.description && pokemon.description[currentLocale]) {
    return pokemon.description[currentLocale];
  }
  if (pokemon.description && pokemon.description.en) {
    return pokemon.description.en;
  }
  return '';
}

/**
 * Get the current locale.
 * @returns {string} Current locale code
 */
function getLocale() {
  return currentLocale;
}

/**
 * Update all translatable text on the page.
 * Scans elements with data-i18n attribute.
 */
function updatePageText() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update language toggle button
  const langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.textContent = currentLocale === 'pt-BR' ? 'EN' : 'PT';
  }
}

/**
 * Subscribe to locale changes.
 * @param {Function} listener
 */
function onLocaleChange(listener) {
  listeners.push(listener);
}

/**
 * Notify all listeners.
 */
function notifyListeners() {
  listeners.forEach(fn => fn(currentLocale, translations));
}

export {
  initI18n,
  switchLocale,
  t,
  getPokemonName,
  getPokemonDescription,
  getLocale,
  updatePageText,
  onLocaleChange,
  SUPPORTED_LOCALES,
};
