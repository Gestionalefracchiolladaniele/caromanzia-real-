import type { DreamSymbol } from '@/types';

// Placeholder until src/data/dream-symbols.json is populated from RoxyAPI.
// Replace this import with the real JSON once available:
//   import DREAM_DB from '@/data/dream-symbols.json';
// The JSON must be an array of { symbol: string; meaning: string; category?: string }

let DREAM_DB: DreamSymbol[] = [];

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  DREAM_DB = require('@/data/dream-symbols.json') as DreamSymbol[];
} catch {
  // File not yet present — symbol extraction will return empty until populated
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')    // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scans dream text against the local symbol DB.
 * Returns matched symbols sorted by specificity (longer match first).
 */
export function extractSymbols(dreamText: string): DreamSymbol[] {
  if (!dreamText || DREAM_DB.length === 0) return [];

  const normalised = normalise(dreamText);

  const matched = DREAM_DB.filter((entry) => {
    const normSymbol = normalise(entry.symbol);
    // whole-word match using word boundaries
    const pattern = new RegExp(`\\b${normSymbol.replace(/\s+/g, '\\s+')}\\b`);
    return pattern.test(normalised);
  });

  // deduplicate by symbol, sort longer match first
  const seen = new Set<string>();
  return matched
    .sort((a, b) => b.symbol.length - a.symbol.length)
    .filter((s) => {
      const key = normalise(s.symbol);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * Returns the top N symbols for display (default 8).
 */
export function getTopSymbols(dreamText: string, limit = 8): DreamSymbol[] {
  return extractSymbols(dreamText).slice(0, limit);
}
