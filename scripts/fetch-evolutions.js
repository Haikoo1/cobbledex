#!/usr/bin/env node

/**
 * fetch-evolutions.js — Busca dados de cadeias evolutivas da PokéAPI
 *
 * Gera data/evolutions.json com detalhes de gatilhos, itens, níveis, etc.
 *
 * Uso:
 *   node scripts/fetch-evolutions.js
 */

const fs = require('fs');
const path = require('path');

const POKEAPI = 'https://pokeapi.co/api/v2';
const OUTPUT = path.join(__dirname, '..', 'data', 'evolutions.json');

const delay = ms => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Cobbledex/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await delay(1000 * (i + 1));
    }
  }
}

/** Extrai detalhes de evolution_details para um formato simples */
function extractDetails(details) {
  if (!details || details.length === 0) return null;
  const d = details[0];
  return {
    trigger: d.trigger?.name || 'unknown',
    min_level: d.min_level,
    item: d.item?.name?.replace(/-/g, ' ') || null,
    held_item: d.held_item?.name?.replace(/-/g, ' ') || null,
    known_move: d.known_move?.name?.replace(/-/g, ' ') || null,
    known_move_type: d.known_move_type?.name || null,
    location: d.location?.name?.replace(/-/g, ' ') || null,
    min_happiness: d.min_happiness,
    min_beauty: d.min_beauty,
    min_affection: d.min_affection,
    time_of_day: d.time_of_day || null,
    gender: d.gender === 1 ? 'female' : d.gender === 2 ? 'male' : null,
    trade_species: d.trade_species?.name || null,
    needs_overworld_rain: d.needs_overworld_rain || false,
    turn_upside_down: d.turn_upside_down || false,
  };
}

/** Percorre a árvore evolutiva e extrai steps */
function walkChain(node, chain = []) {
  const speciesUrl = node.species?.url || '';
  const speciesId = parseInt(speciesUrl.replace(/\/$/, '').split('/').pop());

  const step = {
    id: speciesId,
    name: node.species?.name || 'unknown',
    is_baby: node.is_baby || false,
  };

  if (node.evolution_details && node.evolution_details.length > 0) {
    step.evolution_details = extractDetails(node.evolution_details);
  }

  const steps = [step];

  if (node.evolves_to && node.evolves_to.length > 0) {
    // Só segue o primeiro caminho (evolução linear mais comum)
    // Para branching evolutions, seguimos todos
    for (const child of node.evolves_to) {
      // Procura o step atual em chain e adiciona info de evolução
      const childSteps = walkChain(child, chain);
      // Adiciona os detalhes de evolução ao pai
      if (child.evolution_details && child.evolution_details.length > 0) {
        const details = extractDetails(child.evolution_details);
        // Associa os detalhes ao filho
        if (childSteps.length > 0) {
          childSteps[0].evolution_details = details;
        }
      }
      steps.push(...childSteps);
    }
  }

  return steps;
}

async function main() {
  console.log('⚡ Fetching evolution chains from PokéAPI...\n');

  // Primeiro, pega a lista de todas as species para mapear species -> evolution chain
  console.log('📋 Step 1: Fetching species list...');
  const speciesMap = {}; // species ID -> evolution chain ID
  let nextUrl = `${POKEAPI}/pokemon-species?limit=100`;
  let speciesCount = 0;

  while (nextUrl) {
    const data = await fetchJSON(nextUrl);
    for (const s of data.results) {
      const id = parseInt(s.url.replace(/\/$/, '').split('/').pop());
      // Vamos buscar a species individualmente para pegar evolution_chain
      speciesCount++;
    }
    nextUrl = data.next;
    console.log(`   Found ${data.results.length} species...`);
    await delay(200);
  }

  // Busca species individuais para mapear evolution chains
  console.log(`\n📋 Step 2: Mapping ${speciesCount} species to evolution chains...`);
  let maxChainId = 0;

  for (let id = 1; id <= speciesCount; id++) {
    try {
      const species = await fetchJSON(`${POKEAPI}/pokemon-species/${id}`);
      if (species.evolution_chain?.url) {
        const chainId = parseInt(species.evolution_chain.url.replace(/\/$/, '').split('/').pop());
        speciesMap[id] = chainId;
        if (chainId > maxChainId) maxChainId = chainId;
      }
    } catch (err) {
      // Ignora erros (pokemon não encontrado)
    }
    if (id % 50 === 0) {
      process.stdout.write(`   Mapped ${id}/${speciesCount} species...\r`);
      await delay(100);
    }
  }

  console.log(`\n   Found ${Object.keys(speciesMap).length} species with evolution chains`);
  console.log(`   Max chain ID: ${maxChainId}`);

  // Busca cada chain única
  console.log(`\n📋 Step 3: Fetching ${maxChainId} evolution chains...`);
  const chainMap = {}; // chain ID -> steps array

  for (let chainId = 1; chainId <= maxChainId; chainId++) {
    try {
      const chainData = await fetchJSON(`${POKEAPI}/evolution-chain/${chainId}`);
      const steps = walkChain(chainData.chain);
      chainMap[chainId] = steps;
    } catch (err) {
      // Chain não existe, ignora
    }
    if (chainId % 50 === 0) {
      process.stdout.write(`   Fetched ${chainId}/${maxChainId} chains...\r`);
      await delay(100);
    }
  }

  console.log(`\n   Fetched ${Object.keys(chainMap).length} chains successfully`);

  // Constrói o mapa final: Pokémon ID -> evolutions
  console.log(`\n📋 Step 4: Building evolution map...`);
  const evoMap = {}; // Pokémon ID -> { chain: [ids], steps: [{from, to, trigger, ...}] }

  // Inverte: para cada chain, associa cada Pokémon aos steps
  for (const [chainId, steps] of Object.entries(chainMap)) {
    const ids = steps.map(s => s.id);

    for (const step of steps) {
      const pokemonId = step.id;
      evoMap[pokemonId] = {
        chain: ids,
        is_baby: step.is_baby,
      };
    }

    // Constrói steps de evolução (from -> to)
    for (let i = 0; i < steps.length; i++) {
      const current = steps[i];
      if (current.evolution_details) {
        // Este Pokémon tem detalhes de como EVOLVE PARA o próximo
        // Mas precisamos saber quem é o pai... 
        // O evolution_details está no step child, indicando como ele evoluiu do pai
        // Vamos guardar no filho como "evolved_from_details"
        const pokemonId = current.id;
        if (!evoMap[pokemonId].evolved_from) {
          evoMap[pokemonId].evolved_from = current.evolution_details;
        }
      }
    }
  }

  // Salva
  console.log('💾 Saving...');
  fs.writeFileSync(OUTPUT, JSON.stringify(evoMap, null, 2), 'utf-8');
  console.log(`\n✅ Saved ${Object.keys(evoMap).length} evolution entries to data/evolutions.json`);

  // Estatísticas
  const withMethods = Object.values(evoMap).filter(e => e.evolved_from).length;
  console.log(`   ${withMethods} Pokémon have evolution method data`);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message);
  process.exit(1);
});
