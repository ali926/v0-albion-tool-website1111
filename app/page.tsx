import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Hammer, ArrowLeftRight, Trees, Bell, Coins, BarChart3, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">Albion Online Economic Suite</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Maximize your silver income on EU servers with real-time market data, crafting calculations, and profit
            optimization tools
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Market Tracker</CardTitle>
              </div>
              <CardDescription>
                Real-time prices across all cities. Compare buy/sell orders, volume, and spreads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/market">
                <Button className="w-full">Open Tracker</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Hammer className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Crafting Calculator</CardTitle>
              </div>
              <CardDescription>Calculate profits with focus, city bonuses, taxes, and material costs.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/crafting">
                <Button className="w-full">Calculate Profits</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <ArrowLeftRight className="h-6 w-6 text-chart-2" />
                </div>
                <CardTitle>Market Flipping</CardTitle>
              </div>
              <CardDescription>Find the best arbitrage opportunities between cities and Black Market.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/flipping">
                <Button className="w-full">Scan Markets</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <Trees className="h-6 w-6 text-chart-4" />
                </div>
                <CardTitle>Resource Optimizer</CardTitle>
              </div>
              <CardDescription>Best gathering routes, refining profits, and yield calculations.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/resources">
                <Button className="w-full">Optimize Farming</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-chart-5/10 rounded-lg">
                  <Bell className="h-6 w-6 text-chart-5" />
                </div>
                <CardTitle>Price Alerts</CardTitle>
              </div>
              <CardDescription>
                Set custom alerts for price drops, profit spikes, and market opportunities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/alerts">
                <Button className="w-full">Manage Alerts</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:border-primary transition-colors bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>100% Free</CardTitle>
              </div>
              <CardDescription>Zero cost, zero maintenance. All data from AODP, hosted on Vercel.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4" />
                No subscriptions
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <BarChart3 className="h-4 w-4" />
                Real-time data
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>All tools use live data from the Albion Online Data Project (AODP)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2 text-foreground">For Crafters</h3>
                <p className="text-sm text-muted-foreground">
                  Use the Crafting Calculator to find profitable items. Factor in focus, city bonuses, and taxes. Check
                  the recommended selling city for maximum profit.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-foreground">For Traders</h3>
                <p className="text-sm text-muted-foreground">
                  Scan the Market Flipping tool for arbitrage opportunities. Look for high spreads with good volume and
                  low risk scores.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-foreground">For Gatherers</h3>
                <p className="text-sm text-muted-foreground">
                  Check Resource Optimizer to see which materials are most profitable. Compare gathering vs refining
                  returns with city bonuses.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-foreground">Set Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Create custom alerts to get notified when prices hit your target thresholds. Never miss a profit
                  opportunity again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
