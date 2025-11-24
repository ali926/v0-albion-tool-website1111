// Albion Online Data Project API Client

import type { PriceData, City } from "./types"

const AODP_BASE_URL = "https://www.albion-online-data.com/api/v2"
const CACHE_DURATION = 60000 // 1 minute

interface CachedData<T> {
  data: T
  timestamp: number
}

class AODPClient {
  private cache: Map<string, CachedData<any>> = new Map()

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  async fetchPrices(itemIds: string[], locations?: string[], qualities?: number[]): Promise<PriceData[]> {
    const cacheKey = `prices-${itemIds.join(",")}-${locations?.join(",") || "all"}`
    const cached = this.getCachedData<PriceData[]>(cacheKey)
    if (cached) return cached

    const params = new URLSearchParams()
    params.set("items", itemIds.join(","))
    if (locations) params.set("locations", locations.join(","))
    if (qualities) params.set("qualities", qualities.join(","))

    try {
      const response = await fetch(`${AODP_BASE_URL}/stats/prices/${itemIds[0]}?${params.toString()}`, {
        next: { revalidate: 60 },
      })

      if (!response.ok) {
        throw new Error(`AODP API error: ${response.status}`)
      }

      const data = await response.json()
      this.setCachedData(cacheKey, data)
      return data
    } catch (error) {
      console.error("Error fetching prices:", error)
      return []
    }
  }

  async fetchHistory(itemId: string, locations?: string[], timescale?: 1 | 6 | 24): Promise<any[]> {
    const params = new URLSearchParams()
    if (locations) params.set("locations", locations.join(","))
    if (timescale) params.set("time-scale", timescale.toString())

    try {
      const response = await fetch(`${AODP_BASE_URL}/stats/history/${itemId}?${params.toString()}`, {
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        throw new Error(`AODP API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching history:", error)
      return []
    }
  }

  async fetchGold(): Promise<any[]> {
    try {
      const response = await fetch(`${AODP_BASE_URL}/stats/gold`, {
        next: { revalidate: 300 },
      })

      if (!response.ok) {
        throw new Error(`AODP API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching gold prices:", error)
      return []
    }
  }
}

export const aodpClient = new AODPClient()

// Helper to map city names to AODP location codes
export const CITY_CODES: Record<City, string> = {
  Martlock: "Martlock",
  Lymhurst: "Lymhurst",
  Bridgewatch: "Bridgewatch",
  "Fort Sterling": "FortSterling",
  Thetford: "Thetford",
  Caerleon: "Caerleon",
  "Black Market": "BlackMarket",
}

export const ALL_CITIES: City[] = [
  "Martlock",
  "Lymhurst",
  "Bridgewatch",
  "Fort Sterling",
  "Thetford",
  "Caerleon",
  "Black Market",
]
