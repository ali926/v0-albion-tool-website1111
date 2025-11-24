"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Scan, TrendingUp, AlertCircle, ArrowRight } from "lucide-react"
import { loadItems } from "@/lib/items"
import { CITY_CODES } from "@/lib/aodp-client"
import { assessFlipRisk } from "@/lib/calculations"
import type { FlipOpportunity, City, ItemCategory, AlbionItem } from "@/lib/types"
import { fetchPricesAction } from "@/app/actions/market-actions"

export function FlippingScanner() {
  const [opportunities, setOpportunities] = useState<FlipOpportunity[]>([])
  const [items, setItems] = useState<AlbionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [minProfit, setMinProfit] = useState(10000)
  const [minMargin, setMinMargin] = useState(10)
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | "all">("all")
  const [lastScan, setLastScan] = useState<Date | null>(null)

  useEffect(() => {
    const loadItemsData = async () => {
      const allItems = await loadItems()
      setItems(allItems)
    }
    loadItemsData()
  }, [])

  const scanMarkets = async () => {
    setLoading(true)
    try {
      const itemsToScan = categoryFilter === "all" ? items : items.filter((item) => item.category === categoryFilter)

      const allOpportunities: FlipOpportunity[] = []

      const batchSize = 10
      for (let i = 0; i < Math.min(itemsToScan.length, 50); i += batchSize) {
        const batch = itemsToScan.slice(i, i + batchSize)
        const itemIds = batch.map((item) => item.id)

        const priceData = await fetchPricesAction(itemIds, Object.values(CITY_CODES))

        itemIds.forEach((itemId) => {
          const itemPrices = priceData.filter((p) => p.item_id === itemId)

          for (const buyCity of itemPrices) {
            for (const sellCity of itemPrices) {
              if (buyCity.city === sellCity.city) continue

              const buyPrice = buyCity.buy_price_max
              const sellPrice = sellCity.sell_price_min

              if (buyPrice === 0 || sellPrice === 0) continue
              if (sellPrice <= buyPrice) continue

              const profitPerItem = sellPrice - buyPrice
              const spreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100

              if (profitPerItem < minProfit || spreadPercent < minMargin) continue

              const volume24h = Math.min(buyCity.buy_volume, sellCity.sell_volume)
              const riskScore = assessFlipRisk(spreadPercent, volume24h)

              allOpportunities.push({
                item_id: itemId,
                buy_city: buyCity.city as City,
                sell_city: sellCity.city as City,
                buy_price: buyPrice,
                sell_price: sellPrice,
                spread_percent: spreadPercent,
                profit_per_item: profitPerItem,
                volume_24h: volume24h,
                risk_score: riskScore,
              })
            }
          }
        })
      }

      allOpportunities.sort((a, b) => b.profit_per_item - a.profit_per_item)

      setOpportunities(allOpportunities.slice(0, 50))
      setLastScan(new Date())
    } catch (error) {
      console.error("Error scanning markets:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "default"
      case "medium":
        return "secondary"
      case "high":
        return "destructive"
    }
  }

  const getItemName = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    return item?.name || itemId
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Scanner Configuration</CardTitle>
          <CardDescription>Set your filters and scan the markets for arbitrage opportunities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="min-profit">Minimum Profit per Item</Label>
              <Input
                id="min-profit"
                type="number"
                value={minProfit}
                onChange={(e) => setMinProfit(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-margin">Minimum Margin (%)</Label>
              <Input
                id="min-margin"
                type="number"
                value={minMargin}
                onChange={(e) => setMinMargin(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Item Category</Label>
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ItemCategory | "all")}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="weapon">Weapons</SelectItem>
                  <SelectItem value="armor">Armor</SelectItem>
                  <SelectItem value="resource">Resources</SelectItem>
                  <SelectItem value="consumable">Consumables</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={scanMarkets} disabled={loading} className="w-full" size="lg">
            <Scan className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Scanning Markets..." : "Scan for Opportunities"}
          </Button>

          {lastScan && (
            <div className="text-sm text-muted-foreground text-center">
              Last scanned: {lastScan.toLocaleTimeString()}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top {opportunities.length} Flipping Opportunities
            </CardTitle>
            <CardDescription>Sorted by profit per item (highest first)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Buy From</TableHead>
                    <TableHead>Sell To</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Sell Price</TableHead>
                    <TableHead className="text-right">Profit/Item</TableHead>
                    <TableHead className="text-right">Spread</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp, idx) => (
                    <TableRow key={`${opp.item_id}-${opp.buy_city}-${opp.sell_city}-${idx}`}>
                      <TableCell className="font-medium">{getItemName(opp.item_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{opp.buy_city}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{opp.sell_city}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-destructive">{opp.buy_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-accent">{opp.sell_price.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-primary">+{opp.profit_per_item.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={opp.spread_percent > 20 ? "default" : "secondary"}>
                          {opp.spread_percent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{opp.volume_24h.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getRiskColor(opp.risk_score)}>{opp.risk_score.toUpperCase()}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && opportunities.length === 0 && lastScan && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No Opportunities Found</h3>
              <p className="text-muted-foreground">Try adjusting your filters (lower minimum profit or margin)</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
