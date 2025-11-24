import { Navigation } from "@/components/navigation"
import { MarketTracker } from "@/components/market/market-tracker"

export default function MarketPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Market Price Tracker</h1>
          <p className="text-muted-foreground">Real-time prices across all cities from AODP</p>
        </div>
        <MarketTracker />
      </main>
    </div>
  )
}
