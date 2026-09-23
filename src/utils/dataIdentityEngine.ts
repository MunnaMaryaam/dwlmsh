/**
 * Intelligent Data Identity Engine
 * --------------------------------
 * Learns and remembers branch names, carat/cents, product shortcuts from every upload.
 * Even unorganized files (mixed headers, short codes, price ranges, outlet-wise layouts)
 * are normalized to stable unique identities so reports stay consistent.
 */

import { RawInventoryRecord } from '../types';

const STORAGE_KEY = 'dwl_data_identity_v1';

export interface BranchIdentity {
  canonical: string;       // e.g. "GUL"
  aliases: string[];       // e.g. ["Gulshan", "gulshan-01", "GULSHAN"]
  lastSeen: number;
  hitCount: number;
}

export interface WeightIdentity {
  canonical: string;       // e.g. "0.24" (always 2-decimal when numeric)
  aliases: string[];       // e.g. ["0.24ct", "24 cent", ".24", "24c"]
  numericValue: number | null;
  lastSeen: number;
  hitCount: number;
}

export interface ProductIdentity {
  canonical: string;       // preferred display name
  aliases: string[];       // shortcuts user typed
  lastSeen: number;
  hitCount: number;
}

export interface DataIdentityStore {
  branches: Record<string, BranchIdentity>;
  weights: Record<string, WeightIdentity>;
  products: Record<string, ProductIdentity>;
  updatedAt: number;
}

/** Seed known Diamond World outlet codes + common full names */
const BRANCH_SEED: Record<string, string[]> = {
  DWL: ['dwl', 'diamond world', 'warehouse', 'central warehouse', 'main store', 'head office', 'central'],
  GUL: ['gul', 'gulshan', 'gulshan-1', 'gulshan 1', 'gulshan-01'],
  ONL: ['onl', 'online', 'e-com', 'ecommerce', 'web'],
  BLY: ['bly', 'baily', 'bailey', 'baily road', 'bailey road'],
  MIR: ['mir', 'mirpur'],
  UTT: ['utt', 'uttara'],
  DMD: ['dmd', 'dhanmondi'],
  DNM: ['dnm', 'dhanmondi-2', 'dhanmondi 2'],
  CTG: ['ctg', 'chittagong', 'chattogram', 'ctg-01', 'chittagong - #01'],
  SYL: ['syl', 'sylhet'],
  RAJ: ['raj', 'rajshahi'],
  KHU: ['khu', 'khulna'],
  RAN: ['ran', 'rangpur'],
  BOG: ['bog', 'bogra', 'bogura'],
  SAV: ['sav', 'savar'],
  BAC: ['bac', 'bashundhara', 'bashundhara city'],
  BCT: ['bct', 'badda'],
  CHU: ['chu', 'chawkbazar'],
  CUM: ['cum', 'cumilla', 'comilla'],
  JAS: ['jas', 'jashore', 'jessore'],
  KBH: ['kbh', 'khilgaon'],
  MOH: ['moh', 'mohakhali'],
  NAK: ['nak', 'noakhali'],
  PCT: ['pct', 'panchagarh'],
  RUP: ['rup', 'rupganj']
};

function emptyStore(): DataIdentityStore {
  return { branches: {}, weights: {}, products: {}, updatedAt: Date.now() };
}

function loadStore(): DataIdentityStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStore(emptyStore());
    const parsed = JSON.parse(raw) as DataIdentityStore;
    if (!parsed.branches) return seedStore(emptyStore());
    return seedStore(parsed);
  } catch {
    return seedStore(emptyStore());
  }
}

function saveStore(store: DataIdentityStore) {
  try {
    store.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('dataIdentityEngine: localStorage save failed', err);
  }
}

function seedStore(store: DataIdentityStore): DataIdentityStore {
  Object.entries(BRANCH_SEED).forEach(([canonical, aliases]) => {
    const key = canonical.toUpperCase();
    if (!store.branches[key]) {
      store.branches[key] = {
        canonical: key,
        aliases: aliases.map((a) => a.toLowerCase()),
        lastSeen: 0,
        hitCount: 0
      };
    } else {
      const existing = new Set(store.branches[key].aliases.map((a) => a.toLowerCase()));
      aliases.forEach((a) => existing.add(a.toLowerCase()));
      store.branches[key].aliases = Array.from(existing);
    }
  });
  return store;
}

function normKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[#._\-/\\|,;:()[\]{}'"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Carat / Cents / Weight intelligence ───────────────────────────────────

/**
 * Understand many carat/cents forms:
 *  0.24 | .24 | 0.24ct | 0.24 carat | 24 cent | 24c | 24 cents | 24ct
 *  Also passes through non-numeric product names unchanged (after shortcut resolve).
 */
export function intelligentNormalizeWeight(raw: string, store?: DataIdentityStore): string {
  const s = String(raw || '').trim();
  if (!s) return 'Item-1';

  const st = store || loadStore();

  // Known product / weight alias?
  const nk = normKey(s);
  for (const id of Object.values(st.weights)) {
    if (normKey(id.canonical) === nk || id.aliases.some((a) => normKey(a) === nk)) {
      id.hitCount += 1;
      id.lastSeen = Date.now();
      return id.canonical;
    }
  }
  for (const id of Object.values(st.products)) {
    if (normKey(id.canonical) === nk || id.aliases.some((a) => normKey(a) === nk)) {
      id.hitCount += 1;
      id.lastSeen = Date.now();
      return id.canonical;
    }
  }

  // "24 cent" / "24 cents" / "24c" → 0.24
  const centMatch = s.match(/^(\d+)\s*(c|cent|cents)\b/i);
  if (centMatch) {
    const cents = parseInt(centMatch[1], 10);
    if (!isNaN(cents)) return (cents / 100).toFixed(2);
  }

  // Strip unit words
  const cleaned = s
    .replace(/\b(ct|cts|carat|carats|gm|g|pcs|pc|piece|pieces|unit|units)\b/gi, '')
    .replace(/,/g, '')
    .trim();

  // Pure number
  if (/^[-+]?[0-9]*\.?[0-9]+$/.test(cleaned)) {
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      // Heuristic: integers 1–99 without decimal often mean "cents" in jewelry context
      // but only when original text mentioned cent OR value looks like cent shorthand
      if (
        Number.isInteger(num) &&
        num >= 1 &&
        num <= 99 &&
        /cent|\bc\b/i.test(s)
      ) {
        return (num / 100).toFixed(2);
      }
      return num.toFixed(2);
    }
  }

  // ".24" style
  if (/^\.\d+$/.test(cleaned)) {
    const num = parseFloat('0' + cleaned);
    if (!isNaN(num)) return num.toFixed(2);
  }

  // Keep product / SKU name as-is (trimmed)
  return s;
}

// ─── Branch intelligence ───────────────────────────────────────────────────

export function intelligentNormalizeBranch(raw: string, store?: DataIdentityStore): string {
  const s = String(raw || '').trim();
  if (!s) return 'UNKNOWN';

  const st = store || loadStore();
  const nk = normKey(s);

  // Exact / alias match in learned store
  for (const id of Object.values(st.branches)) {
    if (normKey(id.canonical) === nk || id.aliases.some((a) => normKey(a) === nk)) {
      id.hitCount += 1;
      id.lastSeen = Date.now();
      return id.canonical;
    }
  }

  // Code-like short name (3 letters) → uppercase
  if (/^[a-zA-Z]{2,5}$/.test(s) && !/\s/.test(s)) {
    return s.toUpperCase();
  }

  // "Chittagong - #01" / "Branch-01" style → strip noise, try match
  const stripped = nk
    .replace(/\bbranch\b/g, '')
    .replace(/\bstore\b/g, '')
    .replace(/\boutlet\b/g, '')
    .replace(/\bshowroom\b/g, '')
    .replace(/\d+/g, '')
    .trim();

  for (const id of Object.values(st.branches)) {
    if (id.aliases.some((a) => stripped.includes(normKey(a)) || normKey(a).includes(stripped))) {
      if (stripped.length >= 3) {
        id.hitCount += 1;
        id.lastSeen = Date.now();
        return id.canonical;
      }
    }
  }

  // New branch — keep readable form, prefer short uppercase if short
  if (s.length <= 5 && /^[a-zA-Z0-9]+$/.test(s)) return s.toUpperCase();
  return s;
}

// ─── Learning from uploads ─────────────────────────────────────────────────

export function learnFromRecords(records: RawInventoryRecord[]): void {
  if (!records || records.length === 0) return;
  const store = loadStore();

  records.forEach((r) => {
    // Branch
    const bCanon = intelligentNormalizeBranch(r.branch, store);
    const bKey = bCanon.toUpperCase();
    if (!store.branches[bKey]) {
      store.branches[bKey] = {
        canonical: bCanon,
        aliases: [normKey(r.branch)],
        lastSeen: Date.now(),
        hitCount: 1
      };
    } else {
      const aliases = new Set(store.branches[bKey].aliases.map(normKey));
      aliases.add(normKey(r.branch));
      store.branches[bKey].aliases = Array.from(aliases);
      store.branches[bKey].hitCount += 1;
      store.branches[bKey].lastSeen = Date.now();
    }

    // Weight / product
    const wCanon = intelligentNormalizeWeight(r.weight, store);
    const wNum = parseFloat(wCanon);
    const isNumeric = !isNaN(wNum) && /^[-+]?[0-9]*\.?[0-9]+$/.test(wCanon);

    if (isNumeric) {
      const wKey = wCanon;
      if (!store.weights[wKey]) {
        store.weights[wKey] = {
          canonical: wCanon,
          aliases: [normKey(r.weight)],
          numericValue: wNum,
          lastSeen: Date.now(),
          hitCount: 1
        };
      } else {
        const aliases = new Set(store.weights[wKey].aliases.map(normKey));
        aliases.add(normKey(r.weight));
        store.weights[wKey].aliases = Array.from(aliases);
        store.weights[wKey].hitCount += 1;
        store.weights[wKey].lastSeen = Date.now();
      }
    } else {
      const pKey = normKey(wCanon);
      if (!store.products[pKey]) {
        store.products[pKey] = {
          canonical: wCanon,
          aliases: [normKey(r.weight)],
          lastSeen: Date.now(),
          hitCount: 1
        };
      } else {
        const aliases = new Set(store.products[pKey].aliases.map(normKey));
        aliases.add(normKey(r.weight));
        store.products[pKey].aliases = Array.from(aliases);
        store.products[pKey].hitCount += 1;
        store.products[pKey].lastSeen = Date.now();
      }
    }
  });

  saveStore(store);
}

/** Normalize a full record list in-place style (returns new array) */
export function applyIdentityToRecords(records: RawInventoryRecord[]): RawInventoryRecord[] {
  const store = loadStore();
  return records.map((r) => ({
    ...r,
    branch: intelligentNormalizeBranch(r.branch, store),
    weight: intelligentNormalizeWeight(r.weight, store)
  }));
}

export function getIdentitySnapshot(): DataIdentityStore {
  return loadStore();
}

export function registerBranchAlias(canonical: string, alias: string): void {
  const store = loadStore();
  const key = canonical.toUpperCase();
  if (!store.branches[key]) {
    store.branches[key] = {
      canonical: key,
      aliases: [normKey(alias)],
      lastSeen: Date.now(),
      hitCount: 0
    };
  } else {
    const aliases = new Set(store.branches[key].aliases.map(normKey));
    aliases.add(normKey(alias));
    store.branches[key].aliases = Array.from(aliases);
  }
  saveStore(store);
}

export function registerWeightAlias(canonical: string, alias: string): void {
  const store = loadStore();
  const wCanon = intelligentNormalizeWeight(canonical, store);
  if (!store.weights[wCanon]) {
    store.weights[wCanon] = {
      canonical: wCanon,
      aliases: [normKey(alias)],
      numericValue: parseFloat(wCanon) || null,
      lastSeen: Date.now(),
      hitCount: 0
    };
  } else {
    const aliases = new Set(store.weights[wCanon].aliases.map(normKey));
    aliases.add(normKey(alias));
    store.weights[wCanon].aliases = Array.from(aliases);
  }
  saveStore(store);
}

/**
 * Soft-match price-range style headers in messy sheets.
 * e.g. "0.02-0.20", "2c-20c", "price 5000-10000" → used as filter hints, not row keys.
 */
export function parseRangeToken(token: string): { from: number; to: number } | null {
  const s = String(token || '').trim();
  // Cts range
  const cts = s.match(/(\d*\.?\d+)\s*(?:ct|cts|carat)?\s*[-–—to]+\s*(\d*\.?\d+)/i);
  if (cts) {
    let a = parseFloat(cts[1]);
    let b = parseFloat(cts[2]);
    if (/cent/i.test(s) || (a >= 1 && a <= 99 && b >= 1 && b <= 99 && !s.includes('.'))) {
      a = a / 100;
      b = b / 100;
    }
    if (!isNaN(a) && !isNaN(b)) return { from: Math.min(a, b), to: Math.max(a, b) };
  }
  return null;
}
