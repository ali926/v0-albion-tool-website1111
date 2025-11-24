"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calculator, TrendingUp, Focus, MapPin } from "lucide-react"
import { searchItems, getItemById } from "@/lib/items"
import { getRecipe } from "@/lib/crafting-recipes"
import { ALL_CITIES, CITY_CODES } from "@/lib/aodp-client"
import { CITY_BONUSES, FOCUS_RETURN_RATE, calculateCraftTax, calculateFocusEfficiency } from "@/lib/calculations"
import type { AlbionItem, City, PriceData, CraftingRecipe } from "@/lib/types"
import { fetchPricesAction } from "@/app/actions/market-actions"
import { Skeleton } from "@/components/ui/skeleton"

export function CraftingCalculator() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AlbionItem[]>([])
  const [selectedItem, setSelectedItem] = useState<AlbionItem | null>(null)
  const [recipe, setRecipe] = useState<CraftingRecipe | null>(null)

  // Configuration
  const [useFocus, setUseFocus] = useState(true)
  const [craftingCity, setCraftingCity] = useState<City>("Fort Sterling")
  const [stationFee, setStationFee] = useState(1000)
  const [journalValue, setJournalValue] = useState(0)

  // Price data
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({})
  const [outputPrice, setOutputPrice] = useState(0)
  const [cityPrices, setCityPrices] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(false)

  // Calculations
  const [results, setResults] = useState<{
    materialCost: number
    craftTax: number
    totalCost: number
    revenue: number
    profit: number
    profitMargin: number
    focusEfficiency?: number
  } | null>(null)

  useEffect(() => {
    if (searchQuery.length > 1) {
      const items = searchItems(searchQuery)
      const craftableItems = items.filter((item) => item.craftable)
      setSearchResults(craftableItems.slice(0, 10))
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleSelectItem = async (item: AlbionItem) => {
    setSelectedItem(item)
    setSearchResults([])
    setSearchQuery("")

    const itemRecipe = getRecipe(item.id)
    if (itemRecipe) {
      setRecipe(itemRecipe)
      await loadPrices(item.id, itemRecipe)
    }
  }

  const loadPrices = async (itemId: string, recipe: CraftingRecipe) => {
    setLoading(true)
    try {
      // Get material prices
      const materialIds = recipe.materials.map((m) => m.item_id)
      const allIds = [itemId, ...materialIds]

      const data = await fetchPricesAction(allIds, Object.values(CITY_CODES))

      // Organize prices
      const prices: Record<string, number> = {}
      materialIds.forEach((matId) => {
        const priceData = data.filter((d) => d.item_id === matId)
        if (priceData.length > 0) {
          // Use minimum sell order across all cities for materials
          const minPrice = Math.min(...priceData.map((p) => p.sell_price_min).filter((p) => p > 0))
          prices[matId] = minPrice || 0
        }
      })

      setMaterialPrices(prices)

      // Get output prices for all cities
      const outputPrices = data.filter((d) => d.item_id === itemId)
      setCityPrices(outputPrices)

      if (outputPrices.length > 0) {
        // Use highest sell order for initial calculation
        const maxPrice = Math.max(...outputPrices.map((p) => p.sell_price_min).filter((p) => p > 0))
        setOutputPrice(maxPrice || 0)
      }

      calculateProfit(
        prices,
        outputPrices.length > 0 ? Math.max(...outputPrices.map((p) => p.sell_price_min).filter((p) => p > 0)) : 0,
        recipe,
      )
    } catch (error) {
      console.error("Failed to load prices:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProfit = (
    matPrices: Record<string, number>,
    outPrice: number,
    currentRecipe: CraftingRecipe | null,
  ) => {
    if (!currentRecipe) return

    // Get city bonus
    const cityBonus = CITY_BONUSES[craftingCity]
    const bonusRate = cityBonus?.metalbar || 0 // Should match material type

    // Calculate material cost
    let materialCost = 0
    currentRecipe.materials.forEach((mat) => {
      const price = matPrices[mat.item_id] || 0
      const adjustedQuantity = useFocus
        ? mat.quantity * (1 - FOCUS_RETURN_RATE - bonusRate)
        : mat.quantity * (1 - currentRecipe.base_return_rate - bonusRate)
      materialCost += price * adjustedQuantity
    })

    // Add journal value
    materialCost -= journalValue

    // Calculate craft tax
    const craftTax = calculateCraftTax(outPrice, craftingCity)

    // Total cost
    const totalCost = materialCost + craftTax + stationFee

    // Revenue and profit
    const revenue = outPrice
    const profit = revenue - totalCost
    const profitMargin = (profit / totalCost) * 100

    // Focus efficiency
    let focusEfficiency = undefined
    if (useFocus) {
      const costWithoutFocus = currentRecipe.materials.reduce((sum, mat) => {
        const price = matPrices[mat.item_id] || 0
        const adjustedQuantity = mat.quantity * (1 - currentRecipe.base_return_rate - bonusRate)
        return sum + price * adjustedQuantity
      }, 0)
      const profitWithoutFocus = revenue - (costWithoutFocus + craftTax + stationFee)
      focusEfficiency = calculateFocusEfficiency(profit, profitWithoutFocus, 10000)
    }

    setResults({
      materialCost,
      craftTax,
      totalCost,
      revenue,
      profit,
      profitMargin,
      focusEfficiency,
    })
  }

  useEffect(() => {
    if (recipe) {
      calculateProfit(materialPrices, outputPrice, recipe)
    }
  }, [useFocus, craftingCity, stationFee, journalValue, materialPrices, outputPrice])

  const getBestSellingCity = () => {
    if (cityPrices.length === 0) return null

    const validPrices = cityPrices.filter((p) => p.sell_price_min > 0)
    if (validPrices.length === 0) return null

    return validPrices.reduce((best, current) => {
      return current.sell_price_min > best.sell_price_min ? current : best
    })
  }

  const bestCity = getBestSellingCity()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Craftable Item</CardTitle>
          <CardDescription>Search for items that can be crafted</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search craftable items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchResults.length > 0 && (
              <Card className="absolute z-10 w-full mt-2">
                <CardContent className="p-2">
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">T{item.tier}</Badge>
                          <span>{item.name}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedItem && recipe && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {selectedItem.name}
                <Badge>T{selectedItem.tier}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-4">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="use-focus" className="flex items-center gap-2">
                          <Focus className="h-4 w-4" />
                          Use Focus
                        </Label>
                        <Switch id="use-focus" checked={useFocus} onCheckedChange={setUseFocus} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="crafting-city">
                          <MapPin className="h-4 w-4 inline mr-1" />
                          Crafting City
                        </Label>
                        <Select value={craftingCity} onValueChange={(v) => setCraftingCity(v as City)}>
                          <SelectTrigger id="crafting-city">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_CITIES.map((city) => (
                              <SelectItem key={city} value={city}>
                                {city}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="station-fee">Station Fee</Label>
                        <Input
                          id="station-fee"
                          type="number"
                          value={stationFee}
                          onChange={(e) => setStationFee(Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="journal-value">Journal Value</Label>
                        <Input
                          id="journal-value"
                          type="number"
                          value={journalValue}
                          onChange={(e) => setJournalValue(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recipe.materials.map((mat) => {
                        const item = getItemById(mat.item_id)
                        const price = materialPrices[mat.item_id] || 0
                        const adjustedQuantity = useFocus ? mat.quantity * (1 - FOCUS_RETURN_RATE) : mat.quantity

                        return (
                          <Card key={mat.item_id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{item?.name || mat.item_id}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {mat.quantity} required ({adjustedQuantity.toFixed(1)} with bonuses)
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">{price.toLocaleString()} silver/unit</div>
                                  <div className="text-sm text-muted-foreground">
                                    Total: {(price * adjustedQuantity).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {results && !loading && (
            <>
              <Card className="bg-primary/5 border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Profit Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Material Cost:</span>
                        <span className="font-semibold">{results.materialCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Craft Tax:</span>
                        <span className="font-semibold">{results.craftTax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Station Fee:</span>
                        <span className="font-semibold">{stationFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-medium">Total Cost:</span>
                        <span className="font-bold">{results.totalCost.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-semibold">{results.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t">
                        <span className="font-medium">Profit:</span>
                        <span
                          className={`font-bold text-xl ${results.profit > 0 ? "text-accent" : "text-destructive"}`}
                        >
                          {results.profit > 0 ? "+" : ""}
                          {results.profit.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Margin:</span>
                        <Badge variant={results.profitMargin > 20 ? "default" : "secondary"}>
                          {results.profitMargin.toFixed(2)}%
                        </Badge>
                      </div>
                      {results.focusEfficiency !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Focus Efficiency:</span>
                          <span className="font-semibold">{results.focusEfficiency.toFixed(2)} silver/focus</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {bestCity && (
                <Card className="bg-accent/10 border-accent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      Recommended Selling City
                    </CardTitle>
                    <CardDescription>Where to sell for maximum profit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-accent mb-1">{bestCity.city}</div>
                        <div className="text-sm text-muted-foreground">
                          Volume: {bestCity.sell_volume.toLocaleString()} (24h)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{bestCity.sell_price_min.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">silver</div>
                        {bestCity.sell_price_min > outputPrice && (
                          <div className="text-sm text-accent mt-1">
                            +{(bestCity.sell_price_min - outputPrice).toLocaleString()} more
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Other Cities:</div>
                      <div className="grid grid-cols-2 gap-2">
                        {cityPrices
                          .filter((p) => p.city !== bestCity.city && p.sell_price_min > 0)
                          .map((city) => (
                            <div key={city.city} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{city.city}:</span>
                              <span>{city.sell_price_min.toLocaleString()}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
