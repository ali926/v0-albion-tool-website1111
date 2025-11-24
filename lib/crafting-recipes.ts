// Crafting Recipes Database
// Now loads from generated recipes-full.json

import type { CraftingRecipe } from "./types"

// Cache for loaded recipes
let recipesCache: Map<string, CraftingRecipe> | null = null

// Load recipes from generated JSON
async function loadRecipes(): Promise<Map<string, CraftingRecipe>> {
  if (recipesCache) return recipesCache

  try {
    const recipesModule = await import("./recipes-full.json")
    const recipesArray = recipesModule.default || recipesModule

    // Convert array to map for fast lookup
    recipesCache = new Map()
    for (const recipe of recipesArray) {
      // Adapt to existing CraftingRecipe type
      recipesCache.set(recipe.item_id, {
        item_id: recipe.item_id,
        materials: recipe.materials,
        base_return_rate: recipe.base_return_rate,
      })
    }

    return recipesCache
  } catch (error) {
    console.error("[Albion Tool] Failed to load recipes-full.json:", error)
    console.error('[Albion Tool] Run "npm run build-db" to generate the database')
    return new Map()
  }
}

// Synchronous access to recipes (must be loaded first)
function getRecipesSync(): Map<string, CraftingRecipe> {
  if (!recipesCache) {
    console.warn("[Albion Tool] Recipes not loaded yet. Call loadRecipes() first.")
    return new Map()
  }
  return recipesCache
}

// Get recipe by item ID
export function getRecipe(itemId: string): CraftingRecipe | undefined {
  const recipes = getRecipesSync()
  return recipes.get(itemId) || recipes.get(itemId.toUpperCase())
}

// Get all craftable item IDs
export function getAllCraftableItems(): string[] {
  const recipes = getRecipesSync()
  return Array.from(recipes.keys())
}

// Export load function for initialization
export { loadRecipes, getRecipesSync }

// Initialize recipes on module load
if (typeof window === "undefined") {
  // Server-side: load immediately
  loadRecipes().catch(console.error)
} else {
  // Client-side: load on next tick
  setTimeout(() => loadRecipes().catch(console.error), 0)
}
