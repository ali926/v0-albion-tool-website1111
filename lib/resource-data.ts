// Resource gathering and refining data
// Now integrates with generated database

import type { ItemTier } from "./types"
import { getRecipe } from "./crafting-recipes"
import { getItemById } from "./items"

export interface ResourceInfo {
  id: string
  name: string
  tier: ItemTier
  enchantment: 0 | 1 | 2 | 3 | 4
  type: "ore" | "hide" | "wood" | "fiber" | "rock"
  gathering_time_seconds: number
  yield_min: number
  yield_max: number
}

export interface RefiningInfo {
  raw_id: string
  refined_id: string
  input_amount: number
  output_amount: number
  refining_type: "leather" | "planks" | "metalbar" | "cloth" | "stone"
}

// Base gathering times and yields (estimated from game data)
const RESOURCE_TYPES = [
  { type: "hide" as const, base_time: 15, suffix: "HIDE" },
  { type: "wood" as const, base_time: 12, suffix: "WOOD" },
  { type: "ore" as const, base_time: 18, suffix: "ORE" },
  { type: "fiber" as const, base_time: 10, suffix: "FIBER" },
  { type: "rock" as const, base_time: 20, suffix: "ROCK" },
]

const TIER_MULTIPLIERS: Record<number, number> = {
  2: 0.8,
  3: 0.9,
  4: 1.0,
  5: 1.3,
  6: 1.8,
  7: 2.4,
  8: 3.2,
}

function generateGatheringResources(): ResourceInfo[] {
  const resources: ResourceInfo[] = []

  for (const resourceType of RESOURCE_TYPES) {
    for (let tier = 2; tier <= 8; tier++) {
      const id = `T${tier}_${resourceType.suffix}`
      const item = getItemById(id)

      if (item) {
        const multiplier = TIER_MULTIPLIERS[tier] || 1
        resources.push({
          id,
          name: item.name,
          tier: tier as ItemTier,
          enchantment: 0,
          type: resourceType.type,
          gathering_time_seconds: Math.round(resourceType.base_time * multiplier),
          yield_min: 1,
          yield_max: Math.min(2, Math.floor(1 + tier / 4)),
        })
      }
    }
  }

  return resources
}

function generateRefiningRecipes(): RefiningInfo[] {
  const recipes: RefiningInfo[] = []

  // Map of refined items to their types
  const refiningMap: Record<string, RefiningInfo["refining_type"]> = {
    LEATHER: "leather",
    PLANKS: "planks",
    METALBAR: "metalbar",
    CLOTH: "cloth",
    STONEBLOCK: "stone",
  }

  // Check all tiers and refined resource types
  for (let tier = 2; tier <= 8; tier++) {
    for (const [refined, type] of Object.entries(refiningMap)) {
      const refinedId = `T${tier}_${refined}`
      const recipe = getRecipe(refinedId)

      if (recipe && recipe.materials.length > 0) {
        // Primary material is usually the raw resource
        const primaryMaterial = recipe.materials[0]

        recipes.push({
          raw_id: primaryMaterial.item_id,
          refined_id: refinedId,
          input_amount: primaryMaterial.quantity,
          output_amount: 1,
          refining_type: type,
        })
      }
    }
  }

  return recipes
}

// Export as functions that generate on-demand (after database is loaded)
let gatheringResourcesCache: ResourceInfo[] | null = null
let refiningRecipesCache: RefiningInfo[] | null = null

export function getGatheringResources(): ResourceInfo[] {
  if (!gatheringResourcesCache) {
    gatheringResourcesCache = generateGatheringResources()
  }
  return gatheringResourcesCache
}

export function getRefiningRecipes(): RefiningInfo[] {
  if (!refiningRecipesCache) {
    refiningRecipesCache = generateRefiningRecipes()
  }
  return refiningRecipesCache
}

// Legacy exports for compatibility
export const GATHERING_RESOURCES = getGatheringResources()
export const REFINING_RECIPES = getRefiningRecipes()

export function getRefiningRecipe(rawId: string): RefiningInfo | undefined {
  return getRefiningRecipes().find((r) => r.raw_id === rawId)
}

export function getResourceInfo(id: string): ResourceInfo | undefined {
  return getGatheringResources().find((r) => r.id === id)
}
