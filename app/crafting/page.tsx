import { Navigation } from "@/components/navigation"
import { CraftingCalculator } from "@/components/crafting/crafting-calculator"

export default function CraftingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Crafting Profit Calculator</h1>
          <p className="text-muted-foreground">
            Calculate real profits with focus, city bonuses, taxes, and material costs
          </p>
        </div>
        <CraftingCalculator />
      </main>
    </div>
  )
}
