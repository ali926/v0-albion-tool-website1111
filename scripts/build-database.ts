#!/usr/bin/env node
/**
 * Albion Online Database Builder
 *
 * Fetches item and recipe data from AO Data Project and generates
 * complete local JSON databases for the Albion Tool.
 *
 * Usage: node scripts/build-database.ts [options]
 * Options:
 *   --force      Ignore cache and fetch fresh data
 *   --verbose    Enable detailed logging
 *   --dry-run    Parse and validate without writing files
 *   --sample N   Generate sample database with N items
 */

import { writeFile, readFile, mkdir, access, copyFile } from "fs/promises"
import { join, dirname } from "path"

// Configuration
const AO_DATA_URL = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json"
const CACHE_PATH = "/tmp/ao-dump-cache.json"
const OUTPUT_DIR = join(process.cwd(), "lib")
const ITEMS_OUTPUT = join(OUTPUT_DIR, "items-full.json")
const RECIPES_OUTPUT = join(OUTPUT_DIR, "recipes-full.json")
const BACKUP_DIR = join(OUTPUT_DIR, "backups")

// CLI flags
const args = process.argv.slice(2)
const FORCE = args.includes("--force")
const VERBOSE = args.includes("--verbose")
const DRY_RUN = args.includes("--dry-run")
const SAMPLE_SIZE = args.includes("--sample") ? Number.parseInt(args[args.indexOf("--sample") + 1] || "100") : null

// Types for AO Data
interface AOItem {
  UniqueName: string
  LocalizedNames?: { "EN-US"?: string }
  LocalizationNameVariable?: string
  LocalizationDescriptionVariable?: string
  Index?: number
  Tier?: number
  enchantmentlevel?: number
  craftingrequirements?: {
    craftresource?: Array<{
      uniquename?: string
      count?: string | number
    }>
    silver?: string | number
    time?: string | number
    craftingfocus?: string | number
    amountcrafted?: string | number
    returnamountfactor?: string | number
  }
}

interface ProcessedItem {
  id: string
  name: string
  tier: number
  enchantment: number
  category: string
  craftable: boolean
}

interface ProcessedRecipe {
  item_id: string
  materials: Array<{ item_id: string; quantity: number }>
  base_return_rate: number
  crafting_station?: string
  silver_cost?: number
}

interface BuildStats {
  totalItems: number
  craftableItems: number
  recipesGenerated: number
  warnings: string[]
}

// Utility functions
function log(message: string, level: "info" | "warn" | "error" = "info") {
  const timestamp = new Date().toISOString()
  const prefix = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✓"
  console.log(`[${timestamp}] ${prefix} ${message}`)
}

function verbose(message: string) {
  if (VERBOSE) log(message, "info")
}

// Fetch with retry and caching
async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      verbose(`Fetching ${url} (attempt ${i + 1}/${retries})`)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error
      const delay = Math.pow(2, i) * 1000
      verbose(`Retry in ${delay}ms...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

async function fetchWithCache(url: string, cachePath: string): Promise<any> {
  // Try cache first
  if (!FORCE) {
    try {
      await access(cachePath)
      verbose(`Using cached data from ${cachePath}`)
      const cached = await readFile(cachePath, "utf-8")
      return JSON.parse(cached)
    } catch {
      verbose("No cache found, fetching fresh data")
    }
  }

  // Fetch fresh data
  const data = await fetchWithRetry(url)

  // Save to cache
  try {
    await mkdir(dirname(cachePath), { recursive: true })
    await writeFile(cachePath, JSON.stringify(data, null, 2), "utf-8")
    verbose(`Cached data to ${cachePath}`)
  } catch (error) {
    log(`Failed to cache data: ${error}`, "warn")
  }

  return data
}

// Parse item category from UniqueName
function categorizeItem(uniqueName: string): string {
  const upper = uniqueName.toUpperCase()

  // Weapons
  if (upper.includes("_2H_") || upper.includes("_MAIN_")) return "weapon"
  if (upper.includes("_SWORD") || upper.includes("_BOW") || upper.includes("_CROSSBOW")) return "weapon"
  if (upper.includes("_AXE") || upper.includes("_HAMMER") || upper.includes("_MACE")) return "weapon"
  if (upper.includes("_SPEAR") || upper.includes("_STAFF") || upper.includes("_QUARTERSTAFF")) return "weapon"
  if (upper.includes("_CURSESTAFF") || upper.includes("_FIRESTAFF") || upper.includes("_FROSTSTAFF")) return "weapon"
  if (upper.includes("_ARCANESTAFF") || upper.includes("_HOLYSTAFF") || upper.includes("_NATURESTAFF")) return "weapon"

  // Armor
  if (upper.includes("_HEAD_") || upper.includes("_ARMOR_") || upper.includes("_SHOES_")) return "armor"
  if (upper.includes("_CAPE") || upper.includes("_BAG")) return "armor"

  // Resources
  if (upper.includes("_ORE") || upper.includes("_HIDE") || upper.includes("_WOOD")) return "resource"
  if (upper.includes("_FIBER") || upper.includes("_ROCK") || upper.includes("_LEATHER")) return "resource"
  if (upper.includes("_PLANKS") || upper.includes("_METALBAR") || upper.includes("_CLOTH")) return "resource"

  // Consumables
  if (upper.includes("_MEAL_") || upper.includes("_POTION_")) return "consumable"

  return "other"
}

// Generate readable name from UniqueName
function generateName(item: AOItem): string {
  // Try localized name first
  if (item.LocalizedNames?.["EN-US"]) {
    return item.LocalizedNames["EN-US"]
  }

  // Generate from UniqueName
  const name = item.UniqueName.replace(/^T\d+_/, "") // Remove tier prefix
    .replace(/@\d+$/, "") // Remove enchantment suffix
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")

  return name
}

// Extract tier from UniqueName
function extractTier(uniqueName: string): number {
  const match = uniqueName.match(/^T(\d+)_/)
  return match ? Number.parseInt(match[1]) : 1
}

// Extract enchantment from UniqueName
function extractEnchantment(uniqueName: string): number {
  const match = uniqueName.match(/@(\d+)$/)
  return match ? Number.parseInt(match[1]) : 0
}

// Process items from AO data
function processItems(rawItems: AOItem[], stats: BuildStats): ProcessedItem[] {
  const items: ProcessedItem[] = []
  const seenIds = new Set<string>()

  verbose(`Processing ${rawItems.length} raw items...`)

  for (const item of rawItems) {
    if (!item.UniqueName) continue

    // Skip duplicates
    if (seenIds.has(item.UniqueName)) continue
    seenIds.add(item.UniqueName)

    const tier = item.Tier || extractTier(item.UniqueName)

    // Filter: only include T2-T8 items
    if (tier < 2 || tier > 8) continue

    const processed: ProcessedItem = {
      id: item.UniqueName,
      name: generateName(item),
      tier,
      enchantment: item.enchantmentlevel || extractEnchantment(item.UniqueName),
      category: categorizeItem(item.UniqueName),
      craftable: !!item.craftingrequirements?.craftresource,
    }

    items.push(processed)
    stats.totalItems++
    if (processed.craftable) stats.craftableItems++
  }

  verbose(`Processed ${items.length} items (${stats.craftableItems} craftable)`)
  return items
}

// Process recipes from AO data
function processRecipes(
  rawItems: AOItem[],
  itemsMap: Map<string, ProcessedItem>,
  stats: BuildStats,
): ProcessedRecipe[] {
  const recipes: ProcessedRecipe[] = []
  const unresolvedRefs = new Map<string, number>()

  verbose(`Processing recipes...`)

  for (const item of rawItems) {
    if (!item.UniqueName || !item.craftingrequirements?.craftresource) continue

    const materials: Array<{ item_id: string; quantity: number }> = []
    let hasUnresolved = false

    for (const resource of item.craftingrequirements.craftresource) {
      if (!resource.uniquename) continue

      let itemId = resource.uniquename
      const quantity = typeof resource.count === "string" ? Number.parseInt(resource.count) : resource.count || 1

      // Validate material exists
      if (!itemsMap.has(itemId)) {
        // Try case-insensitive match
        const normalized = Array.from(itemsMap.keys()).find((key) => key.toUpperCase() === itemId.toUpperCase())

        if (normalized) {
          itemId = normalized
        } else {
          // Log unresolved reference
          unresolvedRefs.set(itemId, (unresolvedRefs.get(itemId) || 0) + 1)
          hasUnresolved = true
          if (VERBOSE) {
            stats.warnings.push(`Recipe ${item.UniqueName}: material ${itemId} not found`)
          }
          continue // Skip this material but continue with recipe
        }
      }

      materials.push({ item_id: itemId, quantity })
    }

    // Only add recipe if it has at least one valid material
    if (materials.length > 0) {
      const returnRate = item.craftingrequirements.returnamountfactor
        ? Number.parseFloat(String(item.craftingrequirements.returnamountfactor))
        : 0.152 // Default 15.2% return rate

      recipes.push({
        item_id: item.UniqueName,
        materials,
        base_return_rate: returnRate,
        silver_cost: item.craftingrequirements.silver
          ? Number.parseInt(String(item.craftingrequirements.silver))
          : undefined,
      })

      stats.recipesGenerated++
    } else if (hasUnresolved) {
      stats.warnings.push(`Recipe ${item.UniqueName}: all materials unresolved, skipping`)
    }
  }

  // Log unresolved summary
  if (unresolvedRefs.size > 0) {
    log(`Found ${unresolvedRefs.size} unresolved material references`, "warn")
    if (VERBOSE) {
      const sorted = Array.from(unresolvedRefs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      sorted.forEach(([id, count]) => {
        log(`  ${id}: referenced ${count} times`, "warn")
      })
    }
  }

  verbose(`Processed ${recipes.length} recipes`)
  return recipes
}

// Main build function
async function build() {
  log("Starting Albion Online database build...")
  const startTime = Date.now()

  const stats: BuildStats = {
    totalItems: 0,
    craftableItems: 0,
    recipesGenerated: 0,
    warnings: [],
  }

  try {
    // Fetch data
    log("Fetching AO data dump...")
    const rawData = await fetchWithCache(AO_DATA_URL, CACHE_PATH)

    if (!Array.isArray(rawData)) {
      throw new Error("Invalid data format: expected array")
    }

    // Apply sample filter if requested
    const dataToProcess = SAMPLE_SIZE ? rawData.slice(0, SAMPLE_SIZE) : rawData
    if (SAMPLE_SIZE) {
      log(`Using sample of ${SAMPLE_SIZE} items`)
    }

    // Process items
    log("Processing items...")
    const items = processItems(dataToProcess, stats)
    const itemsMap = new Map(items.map((item) => [item.id, item]))

    // Process recipes
    log("Processing recipes...")
    const recipes = processRecipes(dataToProcess, itemsMap, stats)

    // Validate
    log("Validating data...")
    const recipeItemIds = new Set(recipes.map((r) => r.item_id))
    const orphanedRecipes = recipes.filter((r) => !itemsMap.has(r.item_id))
    if (orphanedRecipes.length > 0) {
      log(`Warning: ${orphanedRecipes.length} recipes for non-existent items`, "warn")
    }

    // Prepare output
    const itemsOutput = items.sort((a, b) => a.id.localeCompare(b.id))
    const recipesOutput = recipes.sort((a, b) => a.item_id.localeCompare(b.item_id))

    if (DRY_RUN) {
      log("DRY RUN: Skipping file writes")
    } else {
      // Create backup directory
      await mkdir(BACKUP_DIR, { recursive: true })

      // Backup existing files
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
      try {
        await access(ITEMS_OUTPUT)
        const backupPath = join(BACKUP_DIR, `items-full-${timestamp}.json`)
        await copyFile(ITEMS_OUTPUT, backupPath)
        verbose(`Backed up items to ${backupPath}`)
      } catch {
        // No existing file to backup
      }

      try {
        await access(RECIPES_OUTPUT)
        const backupPath = join(BACKUP_DIR, `recipes-full-${timestamp}.json`)
        await copyFile(RECIPES_OUTPUT, backupPath)
        verbose(`Backed up recipes to ${backupPath}`)
      } catch {
        // No existing file to backup
      }

      // Write outputs
      log("Writing output files...")
      await mkdir(OUTPUT_DIR, { recursive: true })
      await writeFile(ITEMS_OUTPUT, JSON.stringify(itemsOutput, null, 2), "utf-8")
      await writeFile(RECIPES_OUTPUT, JSON.stringify(recipesOutput, null, 2), "utf-8")

      log(`✓ Wrote ${ITEMS_OUTPUT}`)
      log(`✓ Wrote ${RECIPES_OUTPUT}`)

      // Write warnings file if needed
      if (stats.warnings.length > 0) {
        const warningsPath = join(BACKUP_DIR, `build-warnings-${timestamp}.json`)
        await writeFile(warningsPath, JSON.stringify(stats.warnings, null, 2), "utf-8")
        log(`⚠️ Wrote warnings to ${warningsPath}`, "warn")
      }
    }

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    log("\n═══════════════════════════════════════")
    log("Build Summary:")
    log(`  Total items: ${stats.totalItems}`)
    log(`  Craftable items: ${stats.craftableItems}`)
    log(`  Recipes generated: ${stats.recipesGenerated}`)
    log(`  Warnings: ${stats.warnings.length}`)
    log(`  Duration: ${duration}s`)
    log("═══════════════════════════════════════\n")

    if (stats.warnings.length > 0) {
      log(`Run with --verbose to see detailed warnings`, "warn")
    }

    log("Database build completed successfully!")
  } catch (error) {
    log(`Build failed: ${error}`, "error")
    process.exit(1)
  }
}

// Run
build()
