// Core Types for Albion Tool

export type City = "Martlock" | "Lymhurst" | "Bridgewatch" | "Fort Sterling" | "Thetford" | "Caerleon" | "Black Market"

export type ItemTier = 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Enchantment = 0 | 1 | 2 | 3 | 4

export type ItemCategory = "weapon" | "armor" | "resource" | "consumable" | "other"

export interface AlbionItem {
  id: string
  name: string
  tier: ItemTier
  enchantment: Enchantment
  category: ItemCategory
  craftable: boolean
}

export interface PriceData {
  item_id: string
  city: City
  quality: number
  sell_price_min: number
  sell_price_max: number
  sell_price_avg: number
  buy_price_min: number
  buy_price_max: number
  buy_price_avg: number
  sell_volume: number
  buy_volume: number
  updated_at: string
}

export interface CraftingMaterial {
  item_id: string
  quantity: number
}

export interface CraftingRecipe {
  item_id: string
  materials: CraftingMaterial[]
  base_return_rate: number
}

export interface CraftingCalculation {
  item_id: string
  city: City
  use_focus: boolean
  material_cost: number
  craft_tax: number
  station_fee: number
  output_value: number
  profit: number
  focus_efficiency?: number
}

export interface FlipOpportunity {
  item_id: string
  buy_city: City
  sell_city: City
  buy_price: number
  sell_price: number
  spread_percent: number
  profit_per_item: number
  volume_24h: number
  risk_score: "low" | "medium" | "high"
}

export interface Alert {
  id: string
  item_id: string
  city?: City
  type: "price_drop" | "profit_spike" | "crafting_gain" | "flip_margin" | "refining_profit"
  threshold: number
  enabled: boolean
  created_at: string
}

export interface RefiningCalculation {
  resource_id: string
  city: City
  use_focus: boolean
  input_cost: number
  output_value: number
  profit: number
  return_rate: number
  focus_efficiency?: number
}
