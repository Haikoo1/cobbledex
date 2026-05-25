#!/usr/bin/env node

/**
 * fetch-cobbledex.js — Hybrid data fetcher for Cobbledex Pokédex
 *
 * Strategy (híbrida):
 * 1. Scrapes `/all-mons` from cobbledex.info to get the complete Pokémon list
 * 2. Fetches basic data (stats, types, abilities, sprites) from PokéAPI
 * 3. Scrapes individual `/mon/{name}` pages from cobbledex.info for
 *    Cobblemon-specific data (drops, rarity, biomes, spawn conditions, EV yield)
 * 4. Merges everything into `data/pokemon.json`
 *
 * Usage:
 *   node scripts/fetch-cobbledex.js
 *
 * Options:
 *   --batch=N     Process N Pokémon per batch (default: 50, max: 100)
 *   --start=N     Start from Pokémon ID N (default: 1)
 *   --end=N       End at Pokémon ID N (default: 1025)
 *   --skip-scrape Skip scraping cobbledex individual pages (only PokéAPI data)
 *   --keep-existing  Keep existing Cobblemon data from pokemon.json (no overwrite)
 *
 * Requirements:
 *   node >= 18 (for native fetch)
 *
 * Output:
 *   data/pokemon.json
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.cobbledex.info';
const CDN_URL = 'https://cobbledex.b-cdn.net';
const POKEAPI_URL = 'https://pokeapi.co/api/v2';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'pokemon.json');

// --- Config ---
const BATCH_SIZE = Math.min(parseInt(process.argv.find(a => a.startsWith('--batch='))?.split('=')[1]) || 50, 100);
const START_ID = parseInt(process.argv.find(a => a.startsWith('--start='))?.split('=')[1]) || 1;
const END_ID = parseInt(process.argv.find(a => a.startsWith('--end='))?.split('=')[1]) || 1025;
const SKIP_SCRAPE = process.argv.includes('--skip-scrape');
const KEEP_EXISTING = process.argv.includes('--keep-existing');

// --- Helpers ---

/** Capitalize first letter of a string */
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Slugify a Pokémon name for URLs */
const slugify = name => name.toLowerCase().replace(/[^a-z0-9-]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Delay helper */
const delay = ms => new Promise(r => setTimeout(r, ms));

/** Fetch with retry logic (up to 3 attempts) */
async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Cobbledex-Fetcher/1.0', ...options.headers },
        ...options,
      });
      if (response.ok) return response;
      if (response.status === 429) {
        const wait = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`   ⏳ Rate limited. Waiting ${Math.round(wait / 1000)}s...`);
        await delay(wait);
        continue;
      }
      // Cloudflare sometimes returns 403 for automated requests
      if (response.status === 403) {
        if (attempt < retries) {
          const wait = Math.pow(2, attempt) * 1500 + Math.random() * 1000;
          console.log(`   ⏳ Cloudflare block. Waiting ${Math.round(wait / 1000)}s...`);
          await delay(wait);
          continue;
        }
        return response;
      }
      if (response.status >= 400 && response.status < 500) return response;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`   ⚠ Retry ${attempt}/${retries} for ${url}`);
      await delay(1000 * attempt);
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`);
}

// --- Step 1: Scrape /all-mons from cobbledex.info ---

/**
 * Scrapes the /all-mons page to get the complete list of Pokémon
 * with their IDs, names, and sprite URLs from the CDN.
 */
async function scrapeAllMons() {
  console.log('\n📋 Step 1: Scraping /all-mons from cobbledex.info...');

  const html = await (await fetchWithRetry(`${BASE_URL}/all-mons`)).text();

  // Extract Pokémon entries from <a> tags containing Pokémon data
  // Pattern: <a title="PokemonName #NNNN" href="/mon/pokemon-name">...
  const entries = [];
  const regex = /<a[^>]*title="([^"]+)#(\d+)"[^>]*href="\/mon\/([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const name = match[1].trim();
    const id = parseInt(match[2]);
    const slug = match[3].trim();
    const spriteUrl = match[4].trim();

    entries.push({ id, name, slug, spriteUrl });
  }

  // If the regex didn't work, try a simpler extraction
  if (entries.length === 0) {
    console.log('   ⚠ Primary extraction failed, trying fallback...');
    const linkRegex = /<a[^>]*href="\/mon\/([^"]+)"[^>]*title="([^"]+)#(\d+)"[^>]*>/g;
    while ((match = linkRegex.exec(html)) !== null) {
      entries.push({
        slug: match[1],
        name: match[2].trim(),
        id: parseInt(match[3]),
        spriteUrl: `${CDN_URL}/3dmons/previews/large/${parseInt(match[3])}.webp`,
      });
    }
  }

  if (entries.length === 0) {
    throw new Error('Could not extract any Pokémon from /all-mons. The site structure may have changed.');
  }

  console.log(`   ✅ Found ${entries.length} Pokémon on cobbledex.info`);
  return entries.sort((a, b) => a.id - b.id);
}

// --- Step 2: Fetch base data from PokéAPI ---

/**
 * Fetches basic Pokémon data from PokéAPI (stats, types, abilities, etc.).
 */
async function fetchPokeAPIData(id) {
  try {
    const [pokemonRes, speciesRes] = await Promise.all([
      fetchWithRetry(`${POKEAPI_URL}/pokemon/${id}`),
      fetchWithRetry(`${POKEAPI_URL}/pokemon-species/${id}`),
    ]);

    if (!pokemonRes.ok || !speciesRes.ok) return null;

    const pokemon = await pokemonRes.json();
    const species = await speciesRes.json();

    // Types
    const types = pokemon.types.map(t => capitalize(t.type.name));

    // Abilities
    const abilities = pokemon.abilities.map(a => {
      return a.ability.name.split('-').map(capitalize).join(' ');
    });

    // Stats
    const stats = {
      hp: pokemon.stats[0].base_stat,
      attack: pokemon.stats[1].base_stat,
      defense: pokemon.stats[2].base_stat,
      spAtk: pokemon.stats[3].base_stat,
      spDef: pokemon.stats[4].base_stat,
      speed: pokemon.stats[5].base_stat,
    };

    // Flavor text (English & Portuguese)
    const flavorEn = species.flavor_text_entries?.find(e => e.language.name === 'en');
    const flavorPt = species.flavor_text_entries?.find(e =>
      e.language.name === 'pt-BR' || e.language.name === 'pt'
    );

    const description = {
      en: flavorEn?.flavor_text?.replace(/[\f\n]+/g, ' ') || '',
      'pt-BR': flavorPt?.flavor_text?.replace(/[\f\n]+/g, ' ') || '',
    };

    // Name translations
    const genusEn = species.genera?.find(g => g.language.name === 'en');
    const genusPt = species.genera?.find(g => g.language.name === 'pt-BR' || g.language.name === 'pt');

    // Evolution chain
    let evolutionChain = [];
    try {
      if (species.evolution_chain?.url) {
        const evoRes = await fetchWithRetry(species.evolution_chain.url);
        if (evoRes.ok) {
          const evoData = await evoRes.json();
          let node = evoData.chain;
          while (node) {
            const evoId = parseInt(node.species.url.replace(/\/$/, '').split('/').pop());
            evolutionChain.push(evoId);
            node = node.evolves_to?.[0] || null;
          }
        }
      }
    } catch {
      // Evolution chain is optional
    }

    // Generation
    const generation = species.generation
      ? parseInt(species.generation.url.split('/').filter(Boolean).pop())
      : 1;

    return {
      id: pokemon.id,
      name: capitalize(species.name),
      nameTranslations: {
        en: capitalize(species.name),
        'pt-BR': capitalize(species.name), // Default to English if no pt-BR name
      },
      types,
      stats,
      abilities,
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      generation,
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
      spriteShinyUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${pokemon.id}.png`,
      sprite3dUrl: `${CDN_URL}/3dmons/previews/large/${pokemon.id}.webp`,
      cobbledexUrl: `${BASE_URL}/mon/${slugify(species.name)}`,
      evolutionChain,
      description,
      // Species data
      catchRate: species.capture_rate ?? 0,
      baseHappiness: species.base_happiness ?? 50,
      growthRate: species.growth_rate?.name || 'medium_fast',
      genderRate: species.gender_rate ?? 4,
      hatchCounter: species.hatch_counter ?? 20,
      baseExp: pokemon.base_experience || 0,
      eggGroups: (species.egg_groups || []).map(g => capitalize(g.name)),
      genus: {
        en: genusEn?.genus || '',
        'pt-BR': genusPt?.genus || '',
      },
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby,
    };
  } catch (err) {
    console.error(`   ❌ Error fetching #${id} from PokéAPI: ${err.message}`);
    return null;
  }
}

// --- Step 3: Scrape individual mon pages from cobbledex.info ---

/**
 * Scrapes a single /mon/{slug} page from cobbledex.info for
 * Cobblemon-specific data (drops, rarity, spawn conditions, EV yield, etc.)
 */
async function scrapeMonPage(name, slug) {
  try {
    const res = await fetchWithRetry(`${BASE_URL}/mon/${slug}`, {}, 2);
    if (!res.ok) return null;

    const html = await res.text();
    const data = {};

    // --- Rarity ---
    // Look for rarity in the page (common pattern: "Rarity: Ultra Rare" or similar)
    const rarityMatch = html.match(/Rarity[:\s]*([^<]+)/i) ||
                        html.match(/class="[^"]*rarity[^"]*"[^>]*>([^<]+)</i);
    if (rarityMatch) data.rarity = rarityMatch[1].trim();

    // --- Types ---
    const types = [];
    const typeRegex = /<img[^>]*alt="([A-Za-z]+)"[^>]*class="[^"]*type[^"]*"[^>]*>/g;
    let typeMatch;
    while ((typeMatch = typeRegex.exec(html)) !== null) {
      types.push(capitalize(typeMatch[1]));
    }
    if (types.length > 0) data.types = types;

    // --- Base Stats ---
    const statLabels = ['hp', 'attack', 'defence', 'spatk', 'spdef', 'speed'];
    const statRegex = /(?:HP|Attack|Defence|Defense|Sp\.?\s*Atk|Sp\.?\s*Def|Speed)(\d+)/gi;
    const stats = {};
    let si = 0;
    let sMatch;
    while ((sMatch = statRegex.exec(html)) !== null && si < statLabels.length) {
      stats[statLabels[si]] = parseInt(sMatch[1]);
      si++;
    }
    if (Object.keys(stats).length >= 6) data.stats = stats;

    // --- Abilities ---
    const abilities = [];
    const abilRegex = /#\d+([A-Za-z\s]+?)(?:Hidden)?</gi;
    let abilMatch;
    while ((abilMatch = abilRegex.exec(html)) !== null) {
      const abil = abilMatch[1].trim();
      if (abil && !abilities.includes(abil) && abil.length > 2) {
        abilities.push(abil);
      }
    }
    if (abilities.length > 0) data.abilities = abilities;

    // --- Drops ---
    const drops = [];
    const dropSection = html.match(/Drops([\s\S]*?)(?:Breeding|<h[234])/i);
    if (dropSection) {
      const dropRegex = /([A-Za-z\s]+?)\s*(\d+%)?/g;
      let dropMatch;
      while ((dropMatch = dropRegex.exec(dropSection[1])) !== null) {
        const drop = dropMatch[0].trim();
        if (drop && drop.length > 1 && !drop.includes('Drops')) {
          drops.push(drop);
        }
      }
    }
    data.drops = drops;

    // --- Height & Weight ---
    const heightMatch = html.match(/Height\s*([\d.]+)m/i);
    const weightMatch = html.match(/Weight\s*([\d.]+)kg/i);
    if (heightMatch) data.height = parseFloat(heightMatch[1]);
    if (weightMatch) data.weight = parseFloat(weightMatch[1]);

    // --- EV Yield ---
    const evMatch = html.match(/EV\s*Yield[\s\S]*?(\d+[A-Za-z\s.]+)/i);
    if (evMatch) {
      data.evYield = evMatch[1].trim();
    }

    // --- Egg Groups ---
    const eggMatch = html.match(/Egg\s*Groups?[:\s]*([^<\n]+)/i);
    if (eggMatch) {
      data.eggGroups = eggMatch[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    // --- Gender Ratio ---
    const genderMatch = html.match(/([\d.]+)%\s*M\s*\/\s*([\d.]+)%\s*F/i);
    if (genderMatch) {
      data.genderRatio = {
        male: parseFloat(genderMatch[1]),
        female: parseFloat(genderMatch[2]),
      };
    }

    // --- Catch Rate ---
    const catchMatch = html.match(/Catch\s*Rate[:\s]*(\d+)/i);
    if (catchMatch) data.catchRate = parseInt(catchMatch[1]);

    // --- Base Experience ---
    const expMatch = html.match(/Base\s*Experience[:\s]*(\d+)/i);
    if (expMatch) data.baseExp = parseInt(expMatch[1]);

    // --- Growth Rate ---
    const growthMatch = html.match(/Experience\s*Group[:\s]*([^<\n]+)/i);
    if (growthMatch) data.growthRate = growthMatch[1].trim().toLowerCase().replace(/\s+/g, '_');

    // --- Spawn context (time, weather, etc.) ---
    // Look for spawn-related info in the page
    const spawnSection = html.match(/spawn[\s\S]{0,500}/i)?.[0] || '';

    if (html.includes('Night')) data.time = 'Night';
    else if (html.includes('Day')) data.time = 'Day';
    else data.time = 'Any';

    if (html.includes('Rain')) data.weather = 'Rain';
    else if (html.includes('Clear')) data.weather = 'Clear';
    else if (html.includes('Thunder')) data.weather = 'Thunder';
    else data.weather = 'Any';

    // --- Gen tags ---
    const genMatch = html.match(/Gen\s*(\d+)/i);
    if (genMatch) data.generation = parseInt(genMatch[1]);

    // --- Evolution info ---
    const evoSection = html.match(/How does [^?]+\?([\s\S]*?)(?:Where does|What moves|View Full)/i);
    if (evoSection) {
      data.evolutionText = evoSection[1].trim();
    }      // --- Description ---
      // Extract the actual Pokédex entry from the visible page text.
      // The meta description is just SEO boilerplate, not the real entry.
      // Look for the descriptive text that appears before "Base Stats" section.
      const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                           .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                           .replace(/<[^>]+>/g, ' ')
                           .replace(/\s+/g, ' ')
                           .trim();

      // The Pokédex description is usually a short paragraph right at the start
      // of the visible content, before stat/type info
      const descSection = bodyText.split(/Base Stats/i)[0];
      if (descSection) {
        // Try to find sentences that look like a Pokédex entry (2-3 sentences)
        const sentences = descSection.split(/(?<=\.)\s+/).filter(s => s.trim().length > 20);
        if (sentences.length > 0) {
          // Usually the last substantive sentence(s) before stats is the entry
          const entry = sentences.filter(s => !s.includes('Cobblemon') && !s.includes('cobbledex') && !s.includes('Pokédex') && !s.includes('detailed information')).join(' ').trim();
          if (entry.length > 20) {
            data.description = {
              en: entry,
              'pt-BR': entry,
            };
          }
        }
      }

    return data;
  } catch (err) {
    console.error(`   ⚠ Error scraping ${slug}: ${err.message}`);
    return null;
  }
}

// --- Step 4: Merge data sources ---

/**
 * Merges PokéAPI data with scraped Cobblemon data into the final format.
 */
function mergeData(apiData, cobbleData, existingData) {
  const result = {
    id: apiData.id,
    name: apiData.name,
    nameTranslations: apiData.nameTranslations,
    types: cobbleData?.types || apiData.types,
    stats: cobbleData?.stats || apiData.stats,
    abilities: cobbleData?.abilities || apiData.abilities,
    height: cobbleData?.height || apiData.height,
    weight: cobbleData?.weight || apiData.weight,
    generation: cobbleData?.generation || apiData.generation,
    spriteUrl: apiData.spriteUrl,
    spriteShinyUrl: apiData.spriteShinyUrl,
    sprite3dUrl: apiData.sprite3dUrl,
    cobbledexUrl: apiData.cobbledexUrl,
    evolutionChain: apiData.evolutionChain,
    description: cobbleData?.description || apiData.description,
    // Cobblemon-specific fields
    rarity: cobbleData?.rarity || existingData?.rarity || inferRarity(apiData),
    drops: cobbleData?.drops || existingData?.drops || [],
    biomes: (existingData?.biomes?.length > 0) ? existingData.biomes : inferBiomes(apiData.types),
    context: existingData?.context || 'Grounded',
    time: cobbleData?.time || existingData?.time || 'Any',
    weather: cobbleData?.weather || existingData?.weather || 'Any',
    levels: existingData?.levels || '?',
    skylight: existingData?.skylight || null,
    tags: buildTags(apiData),
    // Species data
    eggGroups: cobbleData?.eggGroups || apiData.eggGroups,
    growthRate: cobbleData?.growthRate || apiData.growthRate,
    baseHappiness: apiData.baseHappiness,
    catchRate: cobbleData?.catchRate || apiData.catchRate,
    genderRate: apiData.genderRate,
    hatchCounter: apiData.hatchCounter,
    baseExp: cobbleData?.baseExp || apiData.baseExp,
    genus: apiData.genus,
    evYield: cobbleData?.evYield || '',
  };

  return result;
}

function inferRarity(apiData) {
  if (apiData.isMythical) return 'Mythical';
  if (apiData.isLegendary) return 'Legendary';
  if (apiData.isBaby) return 'Uncommon';
  const totalStats = Object.values(apiData.stats).reduce((a, b) => a + b, 0);
  if (totalStats >= 600) return 'Ultra Rare';
  if (totalStats >= 500) return 'Rare';
  if (totalStats >= 400) return 'Uncommon';
  return 'Common';
}

function inferBiomes(types) {
  const biomeMap = {
    Water: ['is_freshwater', 'is_ocean'],
    Fire: ['is_volcanic', 'is_hills', 'nether/is_basalt'],
    Grass: ['is_forest', 'is_jungle', 'is_temperate'],
    Electric: ['is_plains', 'is_hills'],
    Ice: ['is_snowy', 'is_glacial'],
    Fighting: ['is_mountain', 'is_plateau'],
    Poison: ['is_swamp', 'is_jungle'],
    Ground: ['is_desert', 'is_badlands'],
    Flying: ['is_mountain', 'is_peak'],
    Psychic: ['is_magical', 'is_end'],
    Bug: ['is_forest', 'is_jungle'],
    Rock: ['is_mountain', 'is_desert', 'is_badlands'],
    Ghost: ['is_spooky', 'is_deep_dark'],
    Dragon: ['is_mountain', 'is_end'],
    Dark: ['is_spooky', 'is_deep_dark'],
    Steel: ['is_mountain', 'is_peak'],
    Fairy: ['is_magical', 'is_forest'],
  };

  const biomes = new Set();
  for (const type of types) {
    const typeBiomes = biomeMap[type];
    if (typeBiomes) typeBiomes.forEach(b => biomes.add(b));
  }
  return biomes.size > 0 ? [...biomes] : ['is_overworld'];
}

function buildTags(apiData) {
  const tags = [`Gen ${apiData.generation}`];
  if (apiData.isLegendary) tags.push('Legendary');
  if (apiData.isMythical) tags.push('Mythical');
  if (apiData.isBaby) tags.push('Baby');
  return tags;
}

// --- Main ---

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║    Cobbledex Data Fetcher (Híbrido)    ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 Config:`);
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Range: #${START_ID} to #${END_ID}`);
  console.log(`   Skip scraping: ${SKIP_SCRAPE ? 'YES' : 'NO'}`);
  console.log(`   Keep existing: ${KEEP_EXISTING ? 'YES' : 'NO'}`);

  // --- Load existing data ---
  let existingData = [];
  let existingMap = {};
  try {
    if (fs.existsSync(OUTPUT_PATH)) {
      existingData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8'));
      existingMap = {};
      for (const p of existingData) {
        existingMap[p.name.toLowerCase()] = p;
        existingMap[String(p.id)] = p;
      }
      console.log(`\n📂 Loaded ${existingData.length} existing Pokémon from pokemon.json`);
    }
  } catch (err) {
    console.log('\n📂 No existing pokemon.json found, starting fresh');
  }

  // --- Step 1: Get Pokémon list from cobbledex.info ---
  let monList;
  try {
    monList = await scrapeAllMons();
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    console.log('   ⚠ Falling back to generating list from PokéAPI IDs...\n');
    monList = [];
    for (let i = START_ID; i <= END_ID; i++) {
      monList.push({
        id: i,
        name: `#${i}`,
        slug: String(i),
        spriteUrl: `${CDN_URL}/3dmons/previews/large/${i}.webp`,
      });
    }
  }

  // Filter by requested range
  monList = monList.filter(m => m.id >= START_ID && m.id <= END_ID);
  console.log(`\n🎯 Processing ${monList.length} Pokémon (IDs ${START_ID}-${END_ID})`);

  // --- Step 2 & 3: Fetch data for each Pokémon ---
  const results = [];
  let fetchedPokeAPI = 0;
  let scrapedCobble = 0;
  let errors = 0;

  for (let i = 0; i < monList.length; i++) {
    const entry = monList[i];
    const id = entry.id;

    if (i > 0 && i % BATCH_SIZE === 0) {
      console.log(`\n📊 Progress: ${i}/${monList.length} | PokéAPI: ${fetchedPokeAPI} | Scraped: ${scrapedCobble} | Errors: ${errors}`);
    }

    // Progress indicator
    if (i % 10 === 0) {
      process.stdout.write(`   [${i}/${monList.length}] Processing #${id}...\r`);
    }

    try {
      // Step 2: Fetch from PokéAPI
      const apiData = await fetchPokeAPIData(id);
      if (!apiData) {
        errors++;
        continue;
      }
      fetchedPokeAPI++;

      // Rate limiting for PokéAPI
      if (fetchedPokeAPI % 10 === 0) {
        await delay(300);
      }

      // Step 3: Scrape cobbledex.info for Cobblemon data
      let cobbleData = null;
      if (!SKIP_SCRAPE && entry.slug && isNaN(parseInt(entry.slug[0]))) {
        const nameSlug = slugify(apiData.name);
        cobbleData = await scrapeMonPage(apiData.name, nameSlug);
        if (cobbleData) scrapedCobble++;

        // Rate limiting for cobbledex
        if (scrapedCobble % 5 === 0) {
          await delay(500);
        }
      }

      // Check existing data (preserve if KEEP_EXISTING)
      const existing = existingMap[String(id)] || existingMap[apiData.name.toLowerCase()];

      // Step 4: Merge
      const merged = mergeData(apiData, cobbleData, existing);

      // Use existing nameTranslations if available
      if (existing?.nameTranslations) {
        merged.nameTranslations = existing.nameTranslations;
      }
          // Preserve manually curated existing data (more accurate than scraping)
      // even during fresh scrape, unless --keep-existing is explicitly used
      // (which means "preserve everything as-is, no updates")
      if (existing) {
        if (existing.biomes?.length > 0) merged.biomes = existing.biomes;
        if (existing.levels && existing.levels !== '?') merged.levels = existing.levels;
        if (existing.skylight) merged.skylight = existing.skylight;
      }

      results.push(merged);
    } catch (err) {
      errors++;
      console.error(`\n   ❌ Error #${id}: ${err.message}`);
    }
  }

  // --- Sort and save ---
  results.sort((a, b) => a.id - b.id);

  console.log(`\n\n📊 Final results:`);
  console.log(`   ✅ PokéAPI: ${fetchedPokeAPI} Pokémon`);
  console.log(`   🔍 Cobbledex scraped: ${scrapedCobble} pages`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📁 Total entries: ${results.length}`);

  // Write to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Saved to: ${OUTPUT_PATH}`);

  // Summary
  const gens = [...new Set(results.map(p => p.generation))].sort((a, b) => a - b);
  const types = [...new Set(results.flatMap(p => p.types))].sort();
  console.log(`\n📈 Coverage:`);
  console.log(`   Generations: ${gens.join(', ')}`);
  console.log(`   Types: ${types.join(', ')}`);
  console.log(`   Rarities: ${[...new Set(results.map(p => p.rarity))].sort().join(', ')}`);
  console.log(`\n✨ Done!`);
}

// Run
main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
