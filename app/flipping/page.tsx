import { Navigation } from "@/components/navigation"
import { FlippingScanner } from "@/components/flipping/flipping-scanner"

export default function FlippingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Market Flipping Scanner</h1>
          <p className="text-muted-foreground">Find the best arbitrage opportunities across all cities</p>
        </div>
        <FlippingScanner />
      </main>
    </div>
  )
}
