import { Navigation } from "@/components/navigation"
import { ResourceOptimizer } from "@/components/resources/resource-optimizer"

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
            Resource Farming & Refining Optimizer
          </h1>
          <p className="text-muted-foreground">
            Find the best gathering and refining opportunities for maximum silver per hour
          </p>
        </div>
        <ResourceOptimizer />
      </main>
    </div>
  )
}
