"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, TrendingUp, TrendingDown, RefreshCw, ArrowUpDown } from "lucide-react"
import { searchItems } from "@/lib/items"
import { CITY_CODES } from "@/lib/aodp-client"
import type { AlbionItem, PriceData } from "@/lib/types"
import { fetchPricesAction } from "@/app/actions/market-actions"
import { Skeleton } from "@/components/ui/skeleton"

type SortField = "city" | "sell_price" | "buy_price" | "spread" | "volume"
type SortDirection = "asc" | "desc"

export function MarketTracker() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<AlbionItem[]>([])
  const [selectedItem, setSelectedItem] = useState<AlbionItem | null>(null)
  const [priceData, setPriceData] = useState<PriceData[]>([])
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField>("city")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    if (searchQuery.length > 1) {
      const results = searchItems(searchQuery)
      setSearchResults(results.slice(0, 10))
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const handleSelectItem = async (item: AlbionItem) => {
    setSelectedItem(item)
    setSearchResults([])
    setSearchQuery("")
    await loadPriceData(item.id)
  }

  const loadPriceData = async (itemId: string) => {
    setLoading(true)
    try {
      const data = await fetchPricesAction([itemId], Object.values(CITY_CODES))
      setPriceData(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to load price data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    if (selectedItem) {
      loadPriceData(selectedItem.id)
    }
  }

  const calculateSpread = (sellPrice: number, buyPrice: number) => {
    if (!sellPrice || !buyPrice || buyPrice === 0) return 0
    return ((sellPrice - buyPrice) / buyPrice) * 100
  }

  const formatPrice = (value: number | undefined | null): string => {
    if (value === undefined || value === null || value === 0) return "N/A"
    return value.toLocaleString()
  }

  const sortedPriceData = [...priceData].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case "city":
        aVal = a.city
        bVal = b.city
        break
      case "sell_price":
        aVal = a.sell_price_min ?? 0
        bVal = b.sell_price_min ?? 0
        break
      case "buy_price":
        aVal = a.buy_price_max ?? 0
        bVal = b.buy_price_max ?? 0
        break
      case "spread":
        aVal = calculateSpread(a.sell_price_min, a.buy_price_max)
        bVal = calculateSpread(b.sell_price_min, b.buy_price_max)
        break
      case "volume":
        aVal = (a.sell_volume ?? 0) + (a.buy_volume ?? 0)
        bVal = (b.sell_volume ?? 0) + (b.buy_volume ?? 0)
        break
    }

    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Items</CardTitle>
          <CardDescription>Find items to track prices across all cities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for items (e.g., Claymore, Hide, Leather)..."
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

      {selectedItem && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedItem.name}
                  <Badge>T{selectedItem.tier}</Badge>
                  {selectedItem.enchantment > 0 && <Badge variant="secondary">.{selectedItem.enchantment}</Badge>}
                </CardTitle>
                <CardDescription>
                  {lastUpdated && <span className="text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : priceData.length > 0 ? (
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comparison">City Comparison</TabsTrigger>
                  <TabsTrigger value="details">Detailed View</TabsTrigger>
                </TabsList>

                <TabsContent value="comparison" className="space-y-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSort("city")}
                              className="flex items-center gap-1"
                            >
                              City
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSort("sell_price")}
                              className="flex items-center gap-1"
                            >
                              Sell Order
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSort("buy_price")}
                              className="flex items-center gap-1"
                            >
                              Buy Order
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSort("spread")}
                              className="flex items-center gap-1"
                            >
                              Spread
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSort("volume")}
                              className="flex items-center gap-1"
                            >
                              Volume (24h)
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedPriceData.map((price) => {
                          const spread = calculateSpread(price.sell_price_min, price.buy_price_max)
                          const totalVolume = (price.sell_volume ?? 0) + (price.buy_volume ?? 0)

                          return (
                            <TableRow key={price.city}>
                              <TableCell className="font-medium">{price.city}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-destructive" />
                                  {formatPrice(price.sell_price_min)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-accent" />
                                  {formatPrice(price.buy_price_max)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={spread > 10 ? "default" : "secondary"}>{spread.toFixed(2)}%</Badge>
                              </TableCell>
                              <TableCell>{totalVolume.toLocaleString()}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {sortedPriceData.map((price) => {
                      const spread = calculateSpread(price.sell_price_min, price.buy_price_max)

                      return (
                        <Card key={price.city}>
                          <CardHeader>
                            <CardTitle className="text-lg">{price.city}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Sell Orders</div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Min:</span>
                                <span className="font-semibold">{formatPrice(price.sell_price_min)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Max:</span>
                                <span className="font-semibold">{formatPrice(price.sell_price_max)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Avg:</span>
                                <span className="font-semibold">{formatPrice(price.sell_price_avg)}</span>
                              </div>
                            </div>

                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Buy Orders</div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Min:</span>
                                <span className="font-semibold">{formatPrice(price.buy_price_min)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Max:</span>
                                <span className="font-semibold">{formatPrice(price.buy_price_max)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Avg:</span>
                                <span className="font-semibold">{formatPrice(price.buy_price_avg)}</span>
                              </div>
                            </div>

                            <div className="pt-3 border-t">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-muted-foreground">Spread:</span>
                                <Badge variant={spread > 10 ? "default" : "secondary"}>{spread.toFixed(2)}%</Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Volume:</span>
                                <span className="text-sm font-medium">
                                  {((price.sell_volume ?? 0) + (price.buy_volume ?? 0)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No price data available for this item</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
