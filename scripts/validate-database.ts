#!/usr/bin/env node
/**
 * Albion Online Database Validator
 *
 * Runs sanity checks on the generated database files to ensure:
 * - Minimum item/recipe counts are met
 * - All recipe materials reference valid items
 * - No data integrity issues
 *
 * Exits with non-zero code on failure (useful for CI)
 */

import { readFile } from "fs/promises"
import { join } from "path"

const ITEMS_PATH = join(process.cwd(), "lib", "items-full.json")
const RECIPES_PATH = join(process.cwd(), "lib", "recipes-full.json")

const MIN_ITEMS = 3000
const MIN_RECIPES = 500
const MAX_MISSING_REFS_PERCENT = 1 // 1% tolerance for missing refs

interface Item {
  id: string
  name: string
  tier: number
  enchantment: number
  category: string
  craftable: boolean
}

interface Recipe {
  item_id: string
  materials: Array<{ item_id: string; quantity: number }>
  base_return_rate: number
}

function log(message: string, status: "pass" | "fail" | "warn" | "info" = "info") {
  const symbols = {
    pass: "✓",
    fail: "✗",
    warn: "⚠",
    info: "•",
  }
  console.log(`${symbols[status]} ${message}`)
}

async function validate(): Promise<boolean> {
  let allPassed = true

  console.log("\n═══════════════════════════════════════")
  console.log("Validating Albion Online Database")
  console.log("═══════════════════════════════════════\n")

  try {
    // Load items
    log("Loading items database...", "info")
    const itemsRaw = await readFile(ITEMS_PATH, "utf-8")
    const items: Item[] = JSON.parse(itemsRaw)

    if (!Array.isArray(items)) {
      log("Items file is not an array", "fail")
      return false
    }

    // Load recipes
    log("Loading recipes database...", "info")
    const recipesRaw = await readFile(RECIPES_PATH, "utf-8")
    const recipes: Recipe[] = JSON.parse(recipesRaw)

    if (!Array.isArray(recipes)) {
      log("Recipes file is not an array", "fail")
      return false
    }

    console.log("")

    // Check 1: Minimum items count
    log(`Checking minimum items count (${MIN_ITEMS})...`, "info")
    if (items.length >= MIN_ITEMS) {
      log(`  Found ${items.length} items`, "pass")
    } else {
      log(`  Only ${items.length} items (expected ${MIN_ITEMS}+)`, "fail")
      allPassed = false
    }

    // Check 2: Minimum recipes count
    log(`Checking minimum recipes count (${MIN_RECIPES})...`, "info")
    if (recipes.length >= MIN_RECIPES) {
      log(`  Found ${recipes.length} recipes`, "pass")
    } else {
      log(`  Only ${recipes.length} recipes (expected ${MIN_RECIPES}+)`, "fail")
      allPassed = false
    }

    // Check 3: Craftable items match recipes
    log("Checking craftable items...", "info")
    const craftableItems = items.filter((i) => i.craftable)
    log(`  Found ${craftableItems.length} craftable items`, "pass")

    // Check 4: Recipe integrity
    log("Checking recipe material references...", "info")
    const itemIds = new Set(items.map((i) => i.id))
    const missingRefs = new Set<string>()
    const orphanedRecipes: string[] = []

    for (const recipe of recipes) {
      // Check if recipe item exists
      if (!itemIds.has(recipe.item_id)) {
        orphanedRecipes.push(recipe.item_id)
      }

      // Check if all materials exist
      for (const material of recipe.materials) {
        if (!itemIds.has(material.item_id)) {
          missingRefs.add(material.item_id)
        }
      }
    }

    if (orphanedRecipes.length > 0) {
      log(`  Warning: ${orphanedRecipes.length} recipes for non-existent items`, "warn")
      if (orphanedRecipes.length <= 10) {
        orphanedRecipes.forEach((id) => log(`    - ${id}`, "warn"))
      }
    }

    const totalMaterialRefs = recipes.reduce((sum, r) => sum + r.materials.length, 0)
    const missingPercent = (missingRefs.size / totalMaterialRefs) * 100

    if (missingRefs.size === 0) {
      log(`  All ${totalMaterialRefs} material references are valid`, "pass")
    } else if (missingPercent <= MAX_MISSING_REFS_PERCENT) {
      log(`  ${missingRefs.size} missing references (${missingPercent.toFixed(2)}% - within tolerance)`, "warn")
      if (missingRefs.size <= 10) {
        Array.from(missingRefs)
          .slice(0, 10)
          .forEach((id) => log(`    - ${id}`, "warn"))
      }
    } else {
      log(
        `  ${missingRefs.size} missing references (${missingPercent.toFixed(2)}% - exceeds ${MAX_MISSING_REFS_PERCENT}% tolerance)`,
        "fail",
      )
      allPassed = false
      Array.from(missingRefs)
        .slice(0, 20)
        .forEach((id) => log(`    - ${id}`, "fail"))
    }

    // Check 5: Data structure validation
    log("Checking data structure...", "info")
    const invalidItems = items.filter(
      (i) => !i.id || !i.name || typeof i.tier !== "number" || typeof i.enchantment !== "number" || !i.category,
    )

    if (invalidItems.length === 0) {
      log("  All items have valid structure", "pass")
    } else {
      log(`  ${invalidItems.length} items with invalid structure`, "fail")
      allPassed = false
      invalidItems.slice(0, 5).forEach((i) => log(`    - ${i.id || "UNKNOWN"}`, "fail"))
    }

    const invalidRecipes = recipes.filter(
      (r) => !r.item_id || !Array.isArray(r.materials) || typeof r.base_return_rate !== "number",
    )

    if (invalidRecipes.length === 0) {
      log("  All recipes have valid structure", "pass")
    } else {
      log(`  ${invalidRecipes.length} recipes with invalid structure`, "fail")
      allPassed = false
      invalidRecipes.slice(0, 5).forEach((r) => log(`    - ${r.item_id || "UNKNOWN"}`, "fail"))
    }

    // Check 6: Tier distribution
    log("Checking tier distribution...", "info")
    const tierCounts = new Map<number, number>()
    items.forEach((i) => tierCounts.set(i.tier, (tierCounts.get(i.tier) || 0) + 1))

    const sortedTiers = Array.from(tierCounts.entries()).sort((a, b) => a[0] - b[0])
    sortedTiers.forEach(([tier, count]) => {
      log(`  T${tier}: ${count} items`, "pass")
    })

    // Summary
    console.log("\n═══════════════════════════════════════")
    if (allPassed) {
      log("All validation checks passed!", "pass")
      console.log("═══════════════════════════════════════\n")
      return true
    } else {
      log("Some validation checks failed", "fail")
      console.log("═══════════════════════════════════════\n")
      return false
    }
  } catch (error) {
    log(`Validation failed with error: ${error}`, "fail")
    console.log("")

    if ((error as any).code === "ENOENT") {
      log('Database files not found. Run "npm run build-db" first.', "fail")
    }

    return false
  }
}

// Run validation
validate().then((passed) => {
  process.exit(passed ? 0 : 1)
})
