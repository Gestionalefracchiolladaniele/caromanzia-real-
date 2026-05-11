/**
 * Scarica simboli dei sogni da RoxyAPI e genera src/data/dream-symbols.json
 * Uso: ROXYAPI_KEY=<key> npx tsx scripts/extract-roxyapi-dreams.ts
 *
 * RoxyAPI endpoint: https://www.roxyapi.com/api/v1/dream-dictionary
 * Formato output: [{ symbol, meaning, category }]
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

const API_KEY = process.env.ROXYAPI_KEY
if (!API_KEY) {
  console.error('❌ ROXYAPI_KEY non impostata. Uso: ROXYAPI_KEY=<key> npx tsx scripts/extract-roxyapi-dreams.ts')
  process.exit(1)
}

const BASE_URL = 'https://www.roxyapi.com/api/v1/dream-dictionary'
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/dream-symbols.json')
const PAGE_SIZE = 100

interface RoxyDreamEntry {
  id?: number
  word?: string
  term?: string
  symbol?: string
  definition?: string
  meaning?: string
  interpretation?: string
  category?: string
  tags?: string[]
}

interface RoxyResponse {
  data?: RoxyDreamEntry[]
  results?: RoxyDreamEntry[]
  items?: RoxyDreamEntry[]
  total?: number
  count?: number
  page?: number
  pages?: number
  next?: string | null
  next_page?: string | null
}

interface DreamSymbol {
  symbol: string
  meaning: string
  category: string
}

function extractSymbol(entry: RoxyDreamEntry): string {
  return (entry.word ?? entry.term ?? entry.symbol ?? '').toLowerCase().trim()
}

function extractMeaning(entry: RoxyDreamEntry): string {
  return (entry.definition ?? entry.meaning ?? entry.interpretation ?? '').trim()
}

function extractCategory(entry: RoxyDreamEntry): string {
  if (entry.category) return entry.category.toLowerCase().trim()
  if (entry.tags && entry.tags.length > 0) return entry.tags[0].toLowerCase().trim()
  return 'generale'
}

async function fetchPage(page: number): Promise<RoxyResponse> {
  const url = `${BASE_URL}?page=${page}&limit=${PAGE_SIZE}`
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-API-Key': API_KEY,
      'Accept': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  return res.json() as Promise<RoxyResponse>
}

async function main() {
  console.log('🔮 Avvio estrazione simboli sogni da RoxyAPI...')

  const allSymbols: DreamSymbol[] = []
  let page = 1
  let hasMore = true

  // Prima pagina per capire struttura risposta
  const firstPage = await fetchPage(1)
  console.log('📋 Struttura risposta:', JSON.stringify(Object.keys(firstPage)))

  const entries = firstPage.data ?? firstPage.results ?? firstPage.items ?? []
  const totalPages = firstPage.pages ?? Math.ceil((firstPage.total ?? firstPage.count ?? entries.length) / PAGE_SIZE)

  console.log(`📊 Totale pagine: ${totalPages}, simboli stimati: ${totalPages * PAGE_SIZE}`)

  for (const entry of entries) {
    const symbol = extractSymbol(entry)
    const meaning = extractMeaning(entry)
    if (symbol && meaning) {
      allSymbols.push({ symbol, meaning, category: extractCategory(entry) })
    }
  }

  page = 2
  while (page <= totalPages && hasMore) {
    try {
      process.stdout.write(`\r⏳ Pagina ${page}/${totalPages} — ${allSymbols.length} simboli...`)
      const data = await fetchPage(page)
      const pageEntries = data.data ?? data.results ?? data.items ?? []

      if (pageEntries.length === 0) {
        hasMore = false
        break
      }

      for (const entry of pageEntries) {
        const symbol = extractSymbol(entry)
        const meaning = extractMeaning(entry)
        if (symbol && meaning) {
          allSymbols.push({ symbol, meaning, category: extractCategory(entry) })
        }
      }

      // Se c'è paginazione con next link
      if (data.next === null || data.next_page === null) {
        hasMore = false
      }

      page++
      // Rate limiting gentile
      await new Promise(r => setTimeout(r, 100))
    }
    catch (err) {
      console.error(`\n⚠️ Errore pagina ${page}:`, err)
      hasMore = false
    }
  }

  console.log(`\n✅ Estratti ${allSymbols.length} simboli`)

  // Deduplica per symbol
  const seen = new Set<string>()
  const deduped = allSymbols.filter(s => {
    if (seen.has(s.symbol)) return false
    seen.add(s.symbol)
    return true
  })

  console.log(`🧹 Dopo deduplicazione: ${deduped.length} simboli unici`)

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2), 'utf-8')
  console.log(`💾 Salvato in ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('❌ Errore fatale:', err)
  process.exit(1)
})
