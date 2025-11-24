// Albion Online Item Database
// Now loads from generated items-full.json

import type { AlbionItem, ItemTier, Enchantment } from "./types"

let itemsCache: AlbionItem[] | null = null

// Load items from generated JSON (server-side or build-time)
async function loadItems(): Promise<AlbionItem[]> {
  if (itemsCache) return itemsCache

  try {
    const itemsModule = await import("./items-full.json")
    itemsCache = itemsModule.default || itemsModule
    return itemsCache
  } catch (error) {
    console.error("[Albion Tool] Failed to load items-full.json:", error)
    console.error('[Albion Tool] Run "npm run build-db" to generate the database')
    return []
  }
}

// Synchronous access to items (must be loaded first)
function getItemsSync(): AlbionItem[] {
  if (!itemsCache) {
    console.warn("[Albion Tool] Items not loaded yet. Call loadItems() first.")
    return []
  }
  return itemsCache
}

// Helper to generate item ID
export function generateItemId(baseName: string, tier: ItemTier, enchantment: Enchantment): string {
  const enchantSuffix = enchantment > 0 ? `@${enchantment}` : ""
  return `T${tier}_${baseName}${enchantSuffix}`
}

export function searchItems(query: string, limit = 100): AlbionItem[] {
  const items = getItemsSync()
  if (items.length === 0) return []

  const lowerQuery = query.toLowerCase()
  const exactMatches: AlbionItem[] = []
  const startsWithMatches: AlbionItem[] = []
  const containsMatches: AlbionItem[] = []

  for (const item of items) {
    const lowerName = item.name.toLowerCase()
    const lowerId = item.id.toLowerCase()

    // Exact match (ID or name)
    if (lowerId === lowerQuery || lowerName === lowerQuery) {
      exactMatches.push(item)
    }
    // Starts with
    else if (lowerName.startsWith(lowerQuery) || lowerId.startsWith(lowerQuery)) {
      startsWithMatches.push(item)
    }
    // Contains
    else if (lowerName.includes(lowerQuery) || lowerId.includes(lowerQuery)) {
      containsMatches.push(item)
    }

    // Stop if we have enough results
    if (exactMatches.length + startsWithMatches.length + containsMatches.length >= limit * 2) {
      break
    }
  }

  // Return prioritized results
  return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, limit)
}

// Get item by ID
export function getItemById(id: string): AlbionItem | undefined {
  const items = getItemsSync()
  return items.find((item) => item.id === id || item.id.toUpperCase() === id.toUpperCase())
}

export { loadItems, getItemsSync }

if (typeof window === "undefined") {
  // Server-side: load immediately
  loadItems().catch(console.error)
} else {
  // Client-side: load on next tick
  setTimeout(() => loadItems().catch(console.error), 0)
}
