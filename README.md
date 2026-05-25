# Cobbledex — Cobblemon Pokédex

> A complete, offline-capable Pokédex for the [Cobblemon Minecraft mod](https://cobblemon.com/), built with vanilla HTML/CSS/JS.

![Cobbledex Preview](https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png)

## ✨ Features

- **🔍 Advanced Search & Filters** — Search by name, filter by type (multi-select), generation, minimum stats, and sort by various fields
- **📊 Detailed Pokémon View** — Stats bars, abilities, evolution chains, type weaknesses, spawn conditions, drops, and breeding info
- **💖 Favorites** — Save your favorite Pokémon to localStorage, export as JSON
- **⚖ Comparator** — Compare up to 3 Pokémon side-by-side in a stat table
- **🌙 Dark/Light Mode** — Respects system preference, toggle persists
- **🌐 Internationalization** — English and Portuguese (pt-BR) with easy extensibility
- **📱 Responsive & Mobile-First** — Works great on phones, tablets, and desktops
- **⚡ PWA** — Install as a standalone app, works offline thanks to Service Worker
- **🕹️ Retro Aesthetic** — Pixel-art inspired UI with scanline effects and game-like animations

## 🚀 Quick Start

### Option 1: Open directly

Simply open `index.html` in your browser:

```bash
# From the project root
open pokedex-cobblemon/index.html
```

### Option 2: Serve locally (recommended for PWA)

Use any static file server:

```bash
# Using Python
cd pokedex-cobblemon && python3 -m http.server 8080

# Using Node.js (if you have npx)
cd pokedex-cobblemon && npx serve .

# Using PHP
cd pokedex-cobblemon && php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

## 🗂️ Project Structure

```
pokedex-cobblemon/
├── index.html              # Main Pokédex page
├── pokemon.html            # Individual Pokémon detail page
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline support)
├── css/
│   ├── reset.css           # CSS reset / normalize
│   ├── variables.css       # Design tokens (colors, fonts, spacing)
│   ├── base.css            # Base typography, animations, utilities
│   ├── components.css      # Cards, badges, buttons, modals, tabs
│   ├── layout.css          # Grid, header, panels, responsive breakpoints
│   └── dark-mode.css       # Dark/light mode overrides
├── js/
│   ├── main.js             # Entry point for index.html
│   ├── pokemon-detail.js   # Entry point for pokemon.html
│   ├── data.js             # Pokémon data loading and shared state
│   ├── search.js           # Search, filtering, sorting, URL sync
│   ├── favorites.js        # Favorites management (localStorage)
│   ├── comparator.js       # Compare up to 3 Pokémon
│   ├── theme.js            # Dark/light mode toggle
│   ├── i18n.js             # Internationalization system
│   └── pwa.js              # Service Worker registration & install prompt
├── data/
│   └── pokemon.json        # All Pokémon data
├── locales/
│   ├── en.json             # English translations
│   └── pt-BR.json          # Portuguese (Brazilian) translations
├── scripts/
│   └── fetch-cobbledex.js  # Node.js script to scrape/update Pokémon data
└── README.md               # This file
```

## 🧩 Modules Overview

### `data.js`
Central data store. Loads `pokemon.json` via `fetch()` and provides `getPokemonById()`, `getPokemonByName()`, and shared reactive state.

### `search.js`
Handles the search input (with 300ms debounce), type/generation/stat filters, sorting, and URL query parameter sync (`?type=fire&gen=1&sort=attack-desc`).

### `favorites.js`
Manages favorites in `localStorage` under the key `cobblemon-favorites`. Supports adding/removing, checking status, and exporting as a downloadable JSON file.

### `comparator.js`
Select up to 3 Pokémon to compare. Opens a modal with a side-by-side stat table, highlighting the highest value in each row.

### `theme.js`
Toggles between dark and light mode. Persists preference in `localStorage`. On first visit, respects `prefers-color-scheme`.

### `i18n.js`
Loads locale JSON files from `/locales/`. Supports dot-notation keys, interpolation, and automatic page text updates. Falls back to English for missing keys.

### `pwa.js`
Registers the Service Worker, handles `beforeinstallprompt` for the install button, and shows online/offline notifications.

## 📦 Data Format

Each Pokémon in `data/pokemon.json` follows this structure:

```json
{
  "id": 1,
  "name": "Bulbasaur",
  "nameTranslations": { "pt-BR": "Bulbassauro", "en": "Bulbasaur" },
  "types": ["Grass", "Poison"],
  "stats": { "hp": 45, "attack": 49, "defense": 49, "spAtk": 65, "spDef": 65, "speed": 45 },
  "abilities": ["Overgrow", "Chlorophyll"],
  "height": 0.7,
  "weight": 6.9,
  "generation": 1,
  "spriteUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png",
  "spriteShinyUrl": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/1.png",
  "sprite3dUrl": "https://cobbledex.b-cdn.net/3dmons/previews/large/1.webp",
  "cobbledexUrl": "https://www.cobbledex.info/pokemon/bulbasaur",
  "evolutionChain": [1, 2, 3],
  "description": {
    "pt-BR": "Por algum tempo após o nascimento...",
    "en": "For some time after its birth..."
  },
  "rarity": "Ultra Rare",
  "drops": ["Melon Seeds 0-1", "Miracle Seed 5%"],
  "biomes": ["is_jungle", "is_tropical_island"],
  "context": "Grounded",
  "time": "Any",
  "weather": "Any",
  "levels": "5-32",
  "skylight": "8-15",
  "tags": ["Starter", "Gen 1"],
  "eggGroups": ["Monster", "Grass"],
  "growthRate": "medium_slow",
  "baseHappiness": 50,
  "catchRate": 45,
  "genderRate": 1,
  "hatchCounter": 20,
  "baseExp": 64
}
```

## 🔄 Updating Pokémon Data

To fetch the latest Pokémon data from PokéAPI and merge with existing Cobblemon-specific data:

### Prerequisites
- Node.js v18+ (for native `fetch`) or install `node-fetch`

### Run the script

```bash
cd pokedex-cobblemon
node scripts/fetch-cobbledex.js
```

This will:
1. Fetch the full Pokémon list from PokéAPI (up to 1000)
2. Fetch detailed data for each Pokémon (stats, types, abilities, etc.)
3. Merge with existing Cobblemon-specific data (rarity, drops, spawn conditions)
4. Write the updated `data/pokemon.json`

**Note:** The script preserves manually curated Cobblemon data (rarity, drops, biomes, spawn conditions) from the existing `pokemon.json` file. For new Pokémon without Cobblemon data, sensible defaults are used.

## 🌍 Adding a New Language

1. Create a new file in `locales/`, e.g., `locales/es.json` (Spanish)
2. Copy the structure from `locales/en.json` and translate the values
3. Add the locale code to the `SUPPORTED_LOCALES` array in `js/i18n.js`
4. The language switcher in the header will automatically include the new option

## 🎨 Customization

### Colors & Theme
All design tokens are defined as CSS custom properties in `css/variables.css`. Modify the `:root` block to change the color scheme.

### Fonts
The project uses three Google Fonts:
- **Press Start 2P** — Retro pixel font for headings
- **VT323** — Terminal-style font for data
- **Share Tech Mono** — Digital font for numbers

Change them in `css/base.css` and update `variables.css` accordingly.

## 📱 PWA Installation

When visiting the site in a Chromium-based browser (Chrome, Edge, etc.), you'll see an "Install Cobbledex" button in the header. Click it to install the app as a standalone PWA that works offline.

The Service Worker (`sw.js`) uses a **Cache First** strategy for static assets and the data JSON, and a **Network First** strategy for other content.

## 🧪 Testing

To test the application:

1. Serve locally (see Quick Start)
2. Open in a mobile viewport (Chrome DevTools → Toggle Device Toolbar)
3. Test at 375px, 390px, 768px, 1280px widths
4. Test offline: DevTools → Network → Offline
5. Test installation: DevTools → Application → Manifest → "Add to homescreen"

## 🛠️ Tech Stack

- **Vanilla HTML/CSS/JS** — No frameworks, no bundlers, no dependencies
- **PokéAPI** — Pokémon data source
- **Cobbledex CDN** — 3D model previews
- **Service Worker** — Offline caching
- **localStorage** — Persisting preferences and favorites

## 📄 License

MIT © Cobbledex Contributors

---

*Built for the Cobblemon community. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.*
