# Albion Tool - Economic Suite for Albion Online

A comprehensive web-based tool suite for Albion Online economy analysis, featuring market tracking, crafting calculators, flipping scanners, and resource optimization tools.

## Features

- **Market Price Tracker** - Real-time price comparison across all cities
- **Crafting Calculator** - Complete profit calculator with focus and city bonuses
- **Market Flipping Scanner** - Identify arbitrage opportunities
- **Resource Optimizer** - Gathering efficiency and refining profit analysis
- **Alert System** - Custom price and profit alerts

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or pnpm

### Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the item and recipe database:
   \`\`\`bash
   npm run build-db
   \`\`\`

3. Validate the database (optional):
   \`\`\`bash
   npm run validate-db
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

5. Open [http://localhost:3000](http://localhost:3000)

### Database Management

The Albion Tool uses a local database generated from the [AO Data Project](https://github.com/ao-data/ao-bin-dumps).

**Build the database:**
\`\`\`bash
npm run build-db
\`\`\`

**Update the database:**
\`\`\`bash
npm run build-db --force
\`\`\`

**Validate the database:**
\`\`\`bash
npm run validate-db
\`\`\`

See [scripts/README.md](scripts/README.md) for detailed documentation on database management.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Data Source**: Albion Online Data Project (AODP)
- **Deployment**: Vercel (free tier compatible)

## Architecture

- **Zero-cost runtime**: All database operations use static JSON files
- **Client-side state**: Alerts and preferences stored in localStorage
- **API caching**: AODP requests cached for performance
- **Serverless**: Runs entirely on Vercel's free tier

## Data Attribution

Item and recipe data sourced from:
- [AO Data Project](https://github.com/ao-data/ao-bin-dumps)
- [Albion Online Data Project API](https://www.albion-online-data.com/)

Albion Online is a game by Sandbox Interactive GmbH. This tool is unofficial and not affiliated with Sandbox Interactive.

## Development

\`\`\`bash
# Install dependencies
npm install

# Generate database
npm run build-db

# Start dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
\`\`\`

## License

MIT License - See LICENSE file for details

Data from Albion Online is property of Sandbox Interactive GmbH.
