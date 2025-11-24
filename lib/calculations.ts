// Calculation Utilities for Crafting, Refining, and Profits

import type { City } from "./types"

// City crafting bonuses (resource return rate %)
export const CITY_BONUSES: Record<City, Record<string, number>> = {
  Martlock: { hide: 0.157, leather: 0.157 },
  Lymhurst: { fiber: 0.157, cloth: 0.157 },
  Bridgewatch: { wood: 0.157, planks: 0.157 },
  "Fort Sterling": { ore: 0.157, metalbar: 0.157 },
  Thetford: { rock: 0.157, stone: 0.157 },
  Caerleon: {},
  "Black Market": {},
}

// Focus return rate (53.9% resource return)
export const FOCUS_RETURN_RATE = 0.539

// Base crafting tax rate (percentage of item value)
export const BASE_TAX_RATE = 0.045

// Calculate crafting tax
export function calculateCraftTax(itemValue: number, city: City = "Caerleon"): number {
  // Tax varies by city, Caerleon has reduced tax
  const taxMultiplier = city === "Caerleon" ? 0.5 : 1.0
  return itemValue * BASE_TAX_RATE * taxMultiplier
}

// Calculate total material cost with bonuses
export function calculateMaterialCost(
  materials: Array<{ item_id: string; quantity: number; price: number }>,
  useBonus: boolean,
  bonusRate = 0,
): number {
  const totalQuantityNeeded = materials.reduce((sum, mat) => {
    const adjustedQuantity = useBonus ? mat.quantity * (1 - bonusRate) : mat.quantity
    return sum + adjustedQuantity * mat.price
  }, 0)

  return totalQuantityNeeded
}

// Calculate focus efficiency (silver per focus point)
export function calculateFocusEfficiency(
  profitWithFocus: number,
  profitWithoutFocus: number,
  focusCost = 10000, // Standard focus cost for crafting
): number {
  const focusBenefit = profitWithFocus - profitWithoutFocus
  return focusBenefit / focusCost
}

// Calculate refining return with focus and city bonus
export function calculateRefiningReturn(inputQuantity: number, useFocus: boolean, cityBonus = 0): number {
  const baseReturn = inputQuantity
  const focusBonus = useFocus ? FOCUS_RETURN_RATE : 0
  const totalBonus = cityBonus + focusBonus

  return baseReturn * (1 + totalBonus)
}

// Calculate profit margin percentage
export function calculateMargin(cost: number, revenue: number): number {
  if (cost === 0) return 0
  return ((revenue - cost) / cost) * 100
}

// Calculate break-even price
export function calculateBreakEven(materialCost: number, tax: number, stationFee: number): number {
  return materialCost + tax + stationFee
}

// Risk assessment for flipping
export function assessFlipRisk(spread: number, volume: number): "low" | "medium" | "high" {
  if (spread > 15 && volume > 100) return "low"
  if (spread > 10 && volume > 50) return "medium"
  return "high"
}
