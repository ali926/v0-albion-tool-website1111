"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Trees, Hammer, TrendingUp, RefreshCw, ArrowRight } from "lucide-react"
import { GATHERING_RESOURCES, REFINING_RECIPES } from "@/lib/resource-data"
import { fetchPricesAction } from "@/app/actions/market-actions"
import { CITY_CODES } from "@/lib/aodp-client"

interface GatheringAnalysis {
  resource_id: string
  resource_name: string
  avg_price: number
  gather_time: number
  avg_yield: number
  silver_per_hour: number
}

interface RefiningAnalysis {
  raw_id: string
  raw_name: string
  refined_id: string
  refined_name: string
  raw_cost: number
  refined_price: number
  profit_per_craft: number
  profit_with_focus: number
  best_city: string
}

export function ResourceOptimizer() {
  const [gatheringData, setGatheringData] = useState<GatheringAnalysis[]>([])
  const [refiningData, setRefiningData] = useState<RefiningAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadResourceData = async () => {
    setLoading(true)
    try {
      // Get all resource IDs
      const resourceIds = GATHERING_RESOURCES.map((r) => r.id)
      const refinedIds = REFINING_RECIPES.map((r) => r.refined_id)
      const allIds = [...resourceIds, ...refinedIds]

      // Fetch prices
      const priceData = await fetchPricesAction(allIds, Object.values(CITY_CODES))

      // Analyze gathering
      const gatheringAnalysis: GatheringAnalysis[] = GATHERING_RESOURCES.map((resource) => {
        const prices = priceData.filter((p) => p.item_id === resource.id)
        const avgPrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p.sell_price_min, 0) / prices.length : 0

        const avgYield = (resource.yield_min + resource.yield_max) / 2
        const silverPerHour = (avgPrice * avgYield * 3600) / resource.gathering_time_seconds

        return {
          resource_id: resource.id,
          resource_name: resource.name,
          avg_price: avgPrice,
          gather_time: resource.gathering_time_seconds,
          avg_yield: avgYield,
          silver_per_hour: silverPerHour,
        }
      })

      gatheringAnalysis.sort((a, b) => b.silver_per_hour - a.silver_per_hour)
      setGatheringData(gatheringAnalysis)

      // Analyze refining
      const refiningAnalysis: RefiningAnalysis[] = REFINING_RECIPES.map((recipe) => {
        const rawPrices = priceData.filter((p) => p.item_id === recipe.raw_id)
        const refinedPrices = priceData.filter((p) => p.item_id === recipe.refined_id)

        const rawCost =
          rawPrices.length > 0 ? Math.min(...rawPrices.map((p) => p.sell_price_min).filter((p) => p > 0)) : 0

        const refinedPrice =
          refinedPrices.length > 0 ? Math.max(...refinedPrices.map((p) => p.sell_price_min).filter((p) => p > 0)) : 0

        const bestCity =
          refinedPrices.length > 0
            ? refinedPrices.reduce((best, current) => (current.sell_price_min > best.sell_price_min ? current : best))
                .city
            : "Unknown"

        // Calculate profit (without focus)
        const totalRawCost = rawCost * recipe.input_amount
        const profitPerCraft = refinedPrice - totalRawCost

        // With focus (53.9% return)
        const rawCostWithFocus = rawCost * recipe.input_amount * (1 - 0.539)
        const profitWithFocus = refinedPrice - rawCostWithFocus

        const rawResource = GATHERING_RESOURCES.find((r) => r.id === recipe.raw_id)
        const refinedName = recipe.refined_id.includes("LEATHER")
          ? "Leather"
          : recipe.refined_id.includes("PLANKS")
            ? "Planks"
            : recipe.refined_id.includes("METALBAR")
              ? "Metal Bar"
              : recipe.refined_id.includes("CLOTH")
                ? "Cloth"
                : "Stone Block"

        return {
          raw_id: recipe.raw_id,
          raw_name: rawResource?.name || recipe.raw_id,
          refined_id: recipe.refined_id,
          refined_name: refinedName,
          raw_cost: rawCost,
          refined_price: refinedPrice,
          profit_per_craft: profitPerCraft,
          profit_with_focus: profitWithFocus,
          best_city: bestCity,
        }
      })

      refiningAnalysis.sort((a, b) => b.profit_with_focus - a.profit_with_focus)
      setRefiningData(refiningAnalysis)

      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error loading resource data:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Resource Analysis</CardTitle>
              <CardDescription>
                {lastUpdated && <span className="text-xs">Last updated: {lastUpdated.toLocaleTimeString()}</span>}
              </CardDescription>
            </div>
            <Button onClick={loadResourceData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analyzing..." : "Analyze Markets"}
            </Button>
          </div>
        </CardHeader>
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

      {!loading && (gatheringData.length > 0 || refiningData.length > 0) && (
        <Tabs defaultValue="gathering" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gathering">
              <Trees className="h-4 w-4 mr-2" />
              Gathering
            </TabsTrigger>
            <TabsTrigger value="refining">
              <Hammer className="h-4 w-4 mr-2" />
              Refining
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gathering" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Best Resources to Gather</CardTitle>
                <CardDescription>Sorted by silver per hour (estimated with average yield)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Gather Time</TableHead>
                        <TableHead className="text-right">Avg Yield</TableHead>
                        <TableHead className="text-right">Silver/Hour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gatheringData.map((data) => (
                        <TableRow key={data.resource_id}>
                          <TableCell className="font-medium">{data.resource_name}</TableCell>
                          <TableCell className="text-right">{data.avg_price.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{data.gather_time}s</TableCell>
                          <TableCell className="text-right">{data.avg_yield.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-primary">
                              {data.silver_per_hour.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refining" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Refining Profit Calculator</CardTitle>
                <CardDescription>Compare raw resource costs vs refined product prices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raw Resource</TableHead>
                        <TableHead>Refined Product</TableHead>
                        <TableHead className="text-right">Raw Cost (x2)</TableHead>
                        <TableHead className="text-right">Refined Price</TableHead>
                        <TableHead className="text-right">Profit (No Focus)</TableHead>
                        <TableHead className="text-right">Profit (Focus)</TableHead>
                        <TableHead>Best City</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refiningData.map((data) => (
                        <TableRow key={data.raw_id}>
                          <TableCell className="font-medium">{data.raw_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              {data.refined_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {(data.raw_cost * 2).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-accent">
                            {data.refined_price.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={data.profit_per_craft > 0 ? "text-accent" : "text-destructive"}>
                              {data.profit_per_craft > 0 ? "+" : ""}
                              {data.profit_per_craft.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-primary">+{data.profit_with_focus.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{data.best_city}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-accent/10 border-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  Refining Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <strong>Focus Bonus:</strong> Using focus returns 53.9% of input resources, drastically increasing
                  profit margins.
                </p>
                <p>
                  <strong>City Bonuses:</strong> Each city provides 15.7% resource return for specific material types
                  (e.g., Fort Sterling for metal).
                </p>
                <p>
                  <strong>Combining Bonuses:</strong> Use focus + city bonus for maximum efficiency (up to 69.6%
                  resource return).
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
