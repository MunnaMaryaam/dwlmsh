import { RawInventoryRecord } from '../types';

export interface DailyInventorySnapshot {
  id: string;
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 20, 2026"
  timestamp: number;
  label: string;
  totalStock: number;
  totalSold: number;
  branchesCount: number;
  variantsCount: number;
  records: RawInventoryRecord[];
}

export interface DayOverDayMovementItem {
  branch: string;
  weight: string;
  previousStock: number;
  currentStock: number;
  stockDelta: number; // current - previous
  detectedUnitsSold: number; // stock reduction = units sold in retail outlet
  replenishedUnits: number;
  daysBetween: number;
  dailySalesVelocity: number;
  daysToStockout: number;
  averageStock: number;
  movementStatus: 'RAPID_OUTFLOW' | 'STEADY_MOVEMENT' | 'REPLENISHED' | 'STAGNANT_IDLE';
}

export interface MovementAgingAnalysisResult {
  previousSnapshot: DailyInventorySnapshot;
  currentSnapshot: DailyInventorySnapshot;
  daysBetween: number;
  totalUnitsSoldDetected: number;
  totalUnitsReplenished: number;
  averageStockLevel: number;
  averageDailySalesRunRate: number;
  items: DayOverDayMovementItem[];
  topMovingOutlets: { branch: string; unitsSold: number }[];
  topMovingVariants: { weight: string; unitsSold: number }[];
  stagnantItemsCount: number;
}

const STORAGE_KEY = 'oracle_retail_daily_snapshots_v2';

/**
 * Loads all saved daily snapshots from localStorage
 */
export function getSavedSnapshots(): DailyInventorySnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (err) {
    console.error('Failed to parse snapshots from localStorage:', err);
    return [];
  }
}

/**
 * Saves a daily inventory snapshot into localStorage
 */
export function saveDailySnapshot(
  records: RawInventoryRecord[],
  dateStr?: string,
  customLabel?: string
): DailyInventorySnapshot {
  const now = new Date();
  const date = dateStr || now.toISOString().slice(0, 10);
  const displayDate = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const totalStock = records.reduce((s, r) => s + (r.currentStock || 0), 0);
  const totalSold = records.reduce((s, r) => s + (r.soldQty || 0), 0);
  const branches = new Set(records.map(r => r.branch));
  const weights = new Set(records.map(r => r.weight));

  const snapshot: DailyInventorySnapshot = {
    id: `snap-${date}-${Date.now()}`,
    date,
    displayDate,
    timestamp: now.getTime(),
    label: customLabel || `Daily Entry (${displayDate}) - ${totalStock} Pcs Stock`,
    totalStock,
    totalSold,
    branchesCount: branches.size,
    variantsCount: weights.size,
    records
  };

  try {
    const existing = getSavedSnapshots();
    // Keep last 30 snapshots to respect quota
    const updated = [snapshot, ...existing.filter(s => s.date !== date)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save snapshot to localStorage:', err);
  }

  return snapshot;
}

/**
 * Compares two snapshots to generate the automated Day-over-Day Movement & Aging Analysis.
 * Implements the user's rule:
 * "jodi ami goto kal stock entry di shekhane 2 pcs thake abar ajke dilam shekhane 1 pcs thake
 * tarmane 1 pcs sale hoyeche koto dine sales hoolo average sales, average stock koto chilo egula dekha jay"
 */
export function compareSnapshots(
  prevSnapshot: DailyInventorySnapshot,
  currSnapshot: DailyInventorySnapshot
): MovementAgingAnalysisResult {
  const prevMap = new Map<string, number>();
  prevSnapshot.records.forEach(r => {
    const key = `${r.branch}__${r.weight}`;
    prevMap.set(key, (prevMap.get(key) || 0) + (r.currentStock || 0));
  });

  const currMap = new Map<string, number>();
  currSnapshot.records.forEach(r => {
    const key = `${r.branch}__${r.weight}`;
    currMap.set(key, (currMap.get(key) || 0) + (r.currentStock || 0));
  });

  const allKeys = new Set([...Array.from(prevMap.keys()), ...Array.from(currMap.keys())]);
  const daysDiff = Math.max(
    1,
    Math.round(Math.abs(currSnapshot.timestamp - prevSnapshot.timestamp) / (1000 * 60 * 60 * 24))
  );

  const items: DayOverDayMovementItem[] = [];
  let totalUnitsSoldDetected = 0;
  let totalUnitsReplenished = 0;

  const branchSalesMap: Record<string, number> = {};
  const weightSalesMap: Record<string, number> = {};
  let stagnantCount = 0;

  allKeys.forEach(key => {
    const [branch, weight] = key.split('__');
    const prevStock = prevMap.get(key) || 0;
    const currStock = currMap.get(key) || 0;
    const stockDelta = currStock - prevStock;

    let detectedUnitsSold = 0;
    let replenishedUnits = 0;

    if (stockDelta < 0) {
      // Stock decreased -> units sold in outlet
      detectedUnitsSold = Math.abs(stockDelta);
      totalUnitsSoldDetected += detectedUnitsSold;
      branchSalesMap[branch] = (branchSalesMap[branch] || 0) + detectedUnitsSold;
      weightSalesMap[weight] = (weightSalesMap[weight] || 0) + detectedUnitsSold;
    } else if (stockDelta > 0) {
      replenishedUnits = stockDelta;
      totalUnitsReplenished += replenishedUnits;
    }

    const avgStock = (prevStock + currStock) / 2;
    const velocity = detectedUnitsSold / daysDiff;
    const daysToStockout = velocity > 0 ? Math.round(currStock / velocity) : 999;

    let movementStatus: DayOverDayMovementItem['movementStatus'] = 'STAGNANT_IDLE';
    if (detectedUnitsSold >= 2 || (detectedUnitsSold > 0 && currStock === 0)) {
      movementStatus = 'RAPID_OUTFLOW';
    } else if (detectedUnitsSold > 0) {
      movementStatus = 'STEADY_MOVEMENT';
    } else if (replenishedUnits > 0) {
      movementStatus = 'REPLENISHED';
    } else {
      stagnantCount++;
    }

    items.push({
      branch,
      weight,
      previousStock: prevStock,
      currentStock: currStock,
      stockDelta,
      detectedUnitsSold,
      replenishedUnits,
      daysBetween: daysDiff,
      dailySalesVelocity: Math.round(velocity * 100) / 100,
      daysToStockout,
      averageStock: Math.round(avgStock * 10) / 10,
      movementStatus
    });
  });

  // Sort items: rapid outflow first
  items.sort((a, b) => b.detectedUnitsSold - a.detectedUnitsSold || a.daysToStockout - b.daysToStockout);

  const topMovingOutlets = Object.entries(branchSalesMap)
    .map(([branch, unitsSold]) => ({ branch, unitsSold }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const topMovingVariants = Object.entries(weightSalesMap)
    .map(([weight, unitsSold]) => ({ weight, unitsSold }))
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const totalCurrentStock = currSnapshot.totalStock;
  const totalPreviousStock = prevSnapshot.totalStock;
  const averageStockLevel = Math.round(((totalPreviousStock + totalCurrentStock) / 2) * 10) / 10;
  const averageDailySalesRunRate = Math.round((totalUnitsSoldDetected / daysDiff) * 100) / 100;

  return {
    previousSnapshot: prevSnapshot,
    currentSnapshot: currSnapshot,
    daysBetween: daysDiff,
    totalUnitsSoldDetected,
    totalUnitsReplenished,
    averageStockLevel,
    averageDailySalesRunRate,
    items,
    topMovingOutlets,
    topMovingVariants,
    stagnantItemsCount: stagnantCount
  };
}

/**
 * Initializes baseline historical snapshots if user visits for the first time,
 * demonstrating yesterday vs today stock transition with exact sold detection.
 */
export function ensureInitialHistoricalData(currentRecords: RawInventoryRecord[]): DailyInventorySnapshot[] {
  const saved = getSavedSnapshots();
  if (saved.length >= 2) return saved;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Generate realistic yesterday records where outlets had +1 or +2 pieces that were sold today
  const yesterdayRecords: RawInventoryRecord[] = currentRecords.map((r, i) => {
    // If the outlet has sales, simulate that yesterday they had +1 piece in stock before selling it
    const hadSale = (r.soldQty || 0) > 0 && (i % 3 === 0 || r.currentStock === 0);
    const addedPrevStock = hadSale ? 1 : 0;
    return {
      ...r,
      id: `prev-${r.id}`,
      currentStock: r.currentStock + addedPrevStock
    };
  });

  const prevDisplayDate = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const currDisplayDate = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const prevSnap: DailyInventorySnapshot = {
    id: `snap-${yesterdayStr}-init`,
    date: yesterdayStr,
    displayDate: prevDisplayDate,
    timestamp: yesterday.getTime(),
    label: `Baseline Previous Stock (${prevDisplayDate})`,
    totalStock: yesterdayRecords.reduce((s, r) => s + r.currentStock, 0),
    totalSold: yesterdayRecords.reduce((s, r) => s + (r.soldQty || 0), 0),
    branchesCount: new Set(yesterdayRecords.map(r => r.branch)).size,
    variantsCount: new Set(yesterdayRecords.map(r => r.weight)).size,
    records: yesterdayRecords
  };

  const currSnap: DailyInventorySnapshot = {
    id: `snap-${todayStr}-current`,
    date: todayStr,
    displayDate: currDisplayDate,
    timestamp: now.getTime(),
    label: `Current Live Audit (${currDisplayDate})`,
    totalStock: currentRecords.reduce((s, r) => s + r.currentStock, 0),
    totalSold: currentRecords.reduce((s, r) => s + (r.soldQty || 0), 0),
    branchesCount: new Set(currentRecords.map(r => r.branch)).size,
    variantsCount: new Set(currentRecords.map(r => r.weight)).size,
    records: currentRecords
  };

  const initialList = [currSnap, prevSnap];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialList));
  } catch (err) {
    console.error('Failed to write initial snapshots:', err);
  }

  return initialList;
}
