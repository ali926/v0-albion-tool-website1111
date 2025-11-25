#!/usr/bin/env node

/**
 * build-database.js — Hybrid AO bin dump + AODP
 *
 * Usage: `node ./scripts/build-database.js [--force] [--dry-run] [--verbose] [--sample N]`
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import process from "process";
import { setTimeout as wait } from "timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LIB_DIR = path.join(ROOT, "lib");
const BACKUPS_DIR = path.join(LIB_DIR, "backups");

const AO_DUMP_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";
const AODP_ITEMS_URL = "https://www.albion-online-data.com/api/v2/items";

const CACHE_AO = "/tmp/ao-dump-cache.json";
const CACHE_AODP = "/tmp/aodp-cache.json";

function log(...args) {
  if (!global.__BUILD_DB_SILENT) {
    console.log(...args);
  }
}

function verbose(...args) {
  if (global.__BUILD_DB_VERBOSE) {
    console.debug(...args);
  }
}

async function ensureDirs() {
  await fs.mkdir(LIB_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

async function fetchWithRetry(url, retries = 3, backoffMs = 500) {
  let attempt = 0;
  while (true) {
    try {
      verbose(`Fetching ${url} (attempt ${attempt + 1})`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      const waitMs = backoffMs * Math.pow(2, attempt-1);
      verbose(`Retrying in ${waitMs}ms`, err);
      await wait(waitMs);
    }
  }
}

function normalizeId(uniqueName) {
  return String(uniqueName).toUpperCase().trim();
}

function detectTier(uniqueName) {
  const m = String(uniqueName).match(/T([0-9])(_|$)/i);
  if (m) return Number(m[1]);
  return undefined;
}

function extractName(raw) {
  return (
    (raw.localizedNames && raw.localizedNames.en) ||
    raw.displayName ||
    raw.name ||
    raw.uniqueName ||
    ""
  );
}

function unifyInputId(candidate) {
  return normalizeId(String(candidate));
}

async function backupIfExists(targetPath) {
  try {
    await fs.access(targetPath);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const base = path.basename(targetPath);
    const dest = path.join(BACKUPS_DIR, `${base}.bak-${ts}`);
    await fs.copyFile(targetPath, dest);
    log(`Backed up: ${dest}`);
  } catch (e) {
    // ignore if file does not exist
  }
}

async function safeWrite(filePath, data) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

async function loadCache(filename) {
  try {
    return await fs.readFile(filename, "utf8");
  } catch {
    return null;
  }
}

async function saveCache(filename, text) {
  try {
    await fs.writeFile(filename, text, "utf8");
  } catch {
    // ignore
  }
}

async function build(opts) {
  global.__BUILD_DB_VERBOSE = !!opts.verbose;
  global.__BUILD_DB_SILENT = false;

  await ensureDirs();

  // 1: Fetch AO dump
  let aoText = null;
  if (!opts.force) {
    aoText = await loadCache(CACHE_AO);
    if (aoText) verbose("Loaded AO dump from cache");
  }
  if (!aoText) {
    try {
      log("Downloading AO bin-dump...");
      aoText = await fetchWithRetry(AO_DUMP_URL, 4, 800);
      await saveCache(CACHE_AO, aoText);
    } catch (err) {
      verbose("AO dump fetch failed:", err);
    }
  }

  // 2: Fetch AODP items
  let aodpText = null;
  if (!opts.force) {
    aodpText = await loadCache(CACHE_AODP);
    if (aodpText) verbose("Loaded AODP items from cache");
  }
  if (!aodpText) {
    try {
      log("Fetching AODP items...");
      aodpText = await fetchWithRetry(AODP_ITEMS_URL, 3, 500);
      await saveCache(CACHE_AODP, aodpText);
    } catch (err) {
      verbose("AODP fetch failed:", err);
    }
  }

  if (!aoText && !aodpText) {
    throw new Error("Could not fetch AO dump or AODP items");
  }

  let rawAoItems = [];
  if (aoText) {
    try {
      const parsed = JSON.parse(aoText);
      if (Array.isArray(parsed)) rawAoItems = parsed;
      else if (parsed.items && Array.isArray(parsed.items)) rawAoItems = parsed.items;
      else rawAoItems = Object.values(parsed);
      verbose(`AO items parsed: ${rawAoItems.length}`);
    } catch (err) {
      verbose("Error parsing AO json:", err);
    }
  }

  let rawAodpItems = [];
  if (aodpText) {
    try {
      const parsed = JSON.parse(aodpText);
      if (Array.isArray(parsed)) rawAodpItems = parsed;
      else rawAodpItems = [];
      verbose(`AODP items parsed: ${rawAodpItems.length}`);
    } catch (err) {
      verbose("Error parsing AODP json:", err);
    }
  }

  // Build item map
  const idToItem = new Map();
  const recipes = [];

  const aodpMap = new Map();
  for (const ai of rawAodpItems) {
    if (ai.item_id) {
      aodpMap.set(normalizeId(ai.item_id), ai);
    }
  }

  for (const raw of rawAoItems) {
    const rawId = raw.uniqueName ?? raw.UniqueName ?? raw.name ?? raw.itemId ?? null;
    if (!rawId) continue;
    const id = normalizeId(rawId);

    const name = extractName(raw) || (aodpMap.get(id) && aodpMap.get(id).name) || id;
    const tier = detectTier(id);
    const enchantment = typeof raw.enchantment === "number" ? raw.enchantment : 0;
    const craftable = !!(raw.craftingRequirements || raw.crafting || raw.requirements);

    const item = {
      id,
      name,
      tier,
      enchantment,
      type: raw.itemType ?? raw.type,
      category: raw.itemCategory ?? raw.category,
      craftable,
      aliases: [name],
      description: raw.description
    };

    idToItem.set(id, item);

    const craft = raw.craftingRequirements ?? raw.crafting ?? raw.requirements ?? null;
    if (craft) {
      const inputs = [];
      const def = craft.craftResource ?? craft.resources ?? craft.requirements ?? craft.ingredients ?? [];
      for (const r of def) {
        const cand = r.uniqueName ?? r.UniqueName ?? r.item ?? r.name;
        const qty = r.count ?? r.Count ?? r.quantity ?? 1;
        if (!cand) continue;
        inputs.push({ item_id: unifyInputId(cand), quantity: Number(qty) });
      }
      const outputCount = Number(craft.outputCount ?? craft.output_count ?? craft.output ?? 1);
      const baseReturnRate = craft.baseReturnRate ?? craft.base_return_rate ?? craft.returnRate;
      const station = craft.stationType ?? craft.craftingStation;
      const silverCost = craft.silverCost ?? craft.silver_cost;

      recipes.push({
        id,
        inputs,
        output_count: outputCount,
        base_return_rate: typeof baseReturnRate === "number" ? Number(baseReturnRate) : undefined,
        crafting_station: station,
        silver_cost: typeof silverCost === "number" ? Number(silverCost) : undefined,
        notes: "Generated from AO dump"
      });
    }
  }

  // Validate recipe inputs
  const known = new Set(idToItem.keys());
  const unresolved = new Set();
  const warnings = [];

  for (const rec of recipes) {
    const missing = [];
    for (const inp of rec.inputs) {
      if (!known.has(inp.item_id)) {
        const attempts = [
          inp.item_id.toUpperCase(),
          inp.item_id.replace(/\./g, "_").toUpperCase(),
          inp.item_id.replace(/@/g, "_").toUpperCase(),
        ];
        let found = false;
        for (const a of attempts) {
          if (known.has(a)) {
            inp.item_id = a;
            found = true;
            break;
          }
        }
        if (!found) {
          missing.push(inp.item_id);
          unresolved.add(inp.item_id);
        }
      }
    }
    if (missing.length) warnings.push({ recipeId: rec.id, missing });
  }

  log(`Parsed items: ${idToItem.size}`);
  log(`Parsed recipes: ${recipes.length}`);
  log(`Unresolved inputs: ${unresolved.size}`);

  // Prepare output arrays
  const itemsArr = Array.from(idToItem.values());
  let recipesArr = recipes;

  if (opts.sample && Number(opts.sample) > 0) {
    const n = Number(opts.sample);
    itemsArr.splice(n);
    recipesArr.splice(n);
    log(`Sample mode: writing ${itemsArr.length} items and ${recipesArr.length} recipes`);
  }

  if (!opts.dryRun) {
    await backupIfExists(path.join(LIB_DIR, "items-full.json"));
    await backupIfExists(path.join(LIB_DIR, "recipes-full.json"));

    await safeWrite(path.join(LIB_DIR, "items-full.json"), itemsArr);
    await safeWrite(path.join(LIB_DIR, "recipes-full.json"), recipesArr);
    log("Database written to lib/");
  } else {
    log("Dry-run: no files written.");
  }

  if (unresolved.size > 0) {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const warnPath = path.join(BACKUPS_DIR, `build-warnings-${ts}.json`);
    await fs.writeFile(
      warnPath,
      JSON.stringify({ unresolved: Array.from(unresolved), warnings }, null, 2),
      "utf8"
    );
    log(`Warnings written to ${warnPath}`);
  }

  return { items: itemsArr.length, recipes: recipesArr.length, warnings: unresolved.size };
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = { force: false, dryRun: false, verbose: false, sample: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--force") opts.force = true;
    if (argv[i] === "--dry-run") opts.dryRun = true;
    if (argv[i] === "--verbose") opts.verbose = true;
    if (argv[i] === "--sample" && argv[i + 1]) {
      opts.sample = Number(argv[i + 1]);
      i++;
    }
  }
  try {
    log("Starting build-database...");
    const result = await build(opts);
    log("Finished:", result);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
