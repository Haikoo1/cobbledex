/**
 * theme.js — Dark/Light mode toggle
 *
 * Features:
 * - Toggle button in header
 * - Persists preference in localStorage (key: 'cobblemon-theme')
 * - Respects prefers-color-scheme on first visit
 * - Smooth CSS transitions (defined in dark-mode.css)
 */

const THEME_KEY = 'cobblemon-theme';

/** @type {boolean} Whether dark mode is active */
let isDarkMode = true;

/** @type {Array<Function>} Theme change listeners */
let listeners = [];

/**
 * Initialize theme from localStorage or system preference.
 * Defaults to dark mode.
 */
function initTheme() {
  const stored = localStorage.getItem(THEME_KEY);

  if (stored === 'light') {
    isDarkMode = false;
  } else if (stored === 'dark') {
    isDarkMode = true;
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode = prefersDark !== false;
  }

  applyTheme();
}

/**
 * Toggle between dark and light mode.
 */
function toggleTheme() {
  isDarkMode = !isDarkMode;
  localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
  applyTheme();
}

/**
 * Apply the current theme to the document body.
 */
function applyTheme() {
  document.body.classList.toggle('dark-mode', isDarkMode);
  updateThemeButton();
  notifyListeners();
}

/**
 * Update the theme toggle button text/icon.
 */
function updateThemeButton() {
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.textContent = isDarkMode ? '☀' : '☾';
    btn.setAttribute('aria-label', isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

/**
 * Subscribe to theme changes.
 * @param {Function} listener - Callback with isDarkMode boolean
 */
function onThemeChange(listener) {
  listeners.push(listener);
}

/**
 * Notify all listeners.
 */
function notifyListeners() {
  listeners.forEach(fn => fn(isDarkMode));
}

export {
  initTheme,
  toggleTheme,
  isDarkMode,
  onThemeChange,
};
