# Albion Online Database Builder

This directory contains scripts to build and validate the complete item and recipe database for the Albion Tool.

## Requirements

- Node.js >= 18 (for native `fetch` support)
- TypeScript (installed as dev dependency)

## Scripts

### `build-database.ts`

Fetches and processes item data from the [AO Data Project](https://github.com/ao-data/ao-bin-dumps) and generates complete local JSON databases.

**Usage:**

\`\`\`bash
# Standard build
npm run build-db

# Force fresh fetch (ignore cache)
node scripts/build-database.ts --force

# Verbose logging
node scripts/build-database.ts --verbose

# Dry run (validate without writing files)
node scripts/build-database.ts --dry-run

# Generate sample database for testing
node scripts/build-database.ts --sample 500
\`\`\`

**What it does:**

1. Fetches `items.json` from `ao-bin-dumps` (with caching to `/tmp/ao-dump-cache.json`)
2. Processes all items (T2-T8) and extracts:
   - Item ID, name, tier, enchantment level
   - Category (weapon, armor, resource, consumable, other)
   - Craftability status
3. Builds crafting recipes from `craftingrequirements` data
4. Validates all recipe materials reference existing items
5. Writes output to:
   - `lib/items-full.json` - Complete item database
   - `lib/recipes-full.json` - Complete recipe database
6. Creates backups in `lib/backups/` before overwriting
7. Logs warnings for any unresolved references

**Output format:**

`lib/items-full.json`:
\`\`\`json
[
  {
    "id": "T4_2H_SWORD",
    "name": "Adept's Claymore",
    "tier": 4,
    "enchantment": 0,
    "category": "weapon",
    "craftable": true
  }
]
\`\`\`

`lib/recipes-full.json`:
\`\`\`json
[
  {
    "item_id": "T4_2H_SWORD",
    "materials": [
      { "item_id": "T4_METALBAR", "quantity": 16 },
      { "item_id": "T3_METALBAR", "quantity": 8 }
    ],
    "base_return_rate": 0.152
  }
]
\`\`\`

### `validate-database.ts`

Runs sanity checks on the generated database files.

**Usage:**

\`\`\`bash
npm run validate-db
\`\`\`

**Checks:**

- At least 3000 items exist
- At least 500 craftable recipes
- All recipe materials reference valid item IDs
- No orphaned recipes

Exits with non-zero code on failure (useful for CI).

## Workflow

1. **First time setup:**
   \`\`\`bash
   npm install
   npm run build-db
   \`\`\`

2. **Verify the build:**
   \`\`\`bash
   npm run validate-db
   npm run dev
   \`\`\`

3. **Test in the app:**
   - Market tracker: search for items like "Claymore", "T8_2H_SWORD"
   - Crafting calculator: load recipes for weapons/armor
   - Resource optimizer: check refining calculations

4. **Update the database:**
   \`\`\`bash
   npm run build-db --force
   \`\`\`

## Data Sources

- Primary: [AO Data Project](https://github.com/ao-data/ao-bin-dumps) - `formatted/items.json`
- License: Data is from Albion Online, a game by Sandbox Interactive GmbH. This tool is unofficial and not affiliated with Sandbox Interactive.

## Troubleshooting

**Build fails with network error:**
- Check internet connection
- Try with `--force` to bypass cache
- Verify the AO Data dump URL is accessible

**Missing items in app:**
- Run `npm run validate-db` to check database integrity
- Check warnings in `lib/backups/build-warnings-*.json`
- Verify `lib/items.ts` is properly importing the generated JSON

**Recipe validation errors:**
- Common for T1 or special event items that may not be in the standard item list
- Check verbose logs with `--verbose` flag
- Most warnings are safe to ignore if they're <1% of total recipes

## Performance

- Initial fetch: ~5-10s (depending on network)
- Cached builds: <1s
- Processing ~7000+ items and ~2000+ recipes
- Output files: ~500KB-2MB total
