"use server"

import { aodpClient } from "@/lib/aodp-client"
import type { PriceData } from "@/lib/types"

export async function fetchPricesAction(itemIds: string[], locations?: string[]): Promise<PriceData[]> {
  try {
    const data = await aodpClient.fetchPrices(itemIds, locations)
    return data
  } catch (error) {
    console.error("Error in fetchPricesAction:", error)
    return []
  }
}

export async function fetchHistoryAction(itemId: string, locations?: string[], timescale?: 1 | 6 | 24): Promise<any[]> {
  try {
    const data = await aodpClient.fetchHistory(itemId, locations, timescale)
    return data
  } catch (error) {
    console.error("Error in fetchHistoryAction:", error)
    return []
  }
}
