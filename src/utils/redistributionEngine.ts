import {
  RawInventoryRecord,
  BranchSummary,
  WeightSummary,
  TransferOrder,
  ProcurementOrder,
  ActionAlert,
  RedistributionReport,
  CategoryConfig,
  SalesTimeframe,
  AllocationMode,
  StockAgingBucket,
  ConsignmentRecommendation,
  OptionAllocationSummary,
  OptionAllocationRow,
  SpecialMonth
} from '../types';
import { ALL_BRANCHES, ALL_WEIGHTS, DEFAULT_PERIOD } from '../data/defaultDataset';
import { CATEGORY_PRESETS } from '../data/categoryPresets';

export function calculateRedistributionReport(
  records: RawInventoryRecord[],
  period: string = DEFAULT_PERIOD,
  categoryConfig?: CategoryConfig,
  baseBranches?: string[],
  baseWeights?: string[],
  selectedTimeframe: SalesTimeframe = '1Y',
  allocationMode: AllocationMode = 'contribution',
  specialMonths?: SpecialMonth[]
): RedistributionReport {
  const activeCategory: CategoryConfig = categoryConfig || CATEGORY_PRESETS[0];

  // Determine branch list
  let branches: string[];
  if (baseBranches && baseBranches.length > 0) {
    const bSet = new Set<string>(baseBranches);
    records.forEach(r => { if (r.branch) bSet.add(r.branch); });
    branches = Array.from(bSet);
  } else if (records.length > 0) {
    const bSet = new Set<string>();
    records.forEach(r => { if (r.branch) bSet.add(r.branch); });
    branches = Array.from(bSet);
  } else {
    branches = [...ALL_BRANCHES];
  }

  // Determine items / weights list
  let weights: string[];
  if (baseWeights && baseWeights.length > 0) {
    const wSet = new Set<string>(baseWeights);
    records.forEach(r => { if (r.weight) wSet.add(r.weight); });
    weights = Array.from(wSet);
  } else if (records.length > 0) {
    const wSet = new Set<string>();
    records.forEach(r => { if (r.weight) wSet.add(r.weight); });
    weights = Array.from(wSet);
  } else {
    weights = [...ALL_WEIGHTS];
  }

  // Sort weights/items smartly (numeric if all numbers, otherwise alphabetical)
  weights.sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB) && /^[-+]?[0-9]*\.?[0-9]+$/.test(a) && /^[-+]?[0-9]*\.?[0-9]+$/.test(b)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  });

  const isWarehouseBranch = (b: string) => {
    const lower = b.toLowerCase().trim();
    // DWL is the company's central warehouse — never treated as a retail showroom
    return lower === 'dwl' ||
      lower.startsWith('dwl ') ||
      lower.endsWith(' dwl') ||
      lower.includes('warehouse') ||
      lower.includes('central') ||
      lower.includes('hub') ||
      lower.includes('distribution center') ||
      lower === 'dc' ||
      lower.endsWith(' dc');
  };

  // Matrix cells setup
  const matrixCells: Record<string, Record<string, {
    sold: number;
    stock: number;
    sales3M?: number;
    sales6M?: number;
    sales1Y?: number;
    sales2Y?: number;
    moveIn: number;
    moveOut: number;
    netMove: number;
  }>> = {};

  branches.forEach((b) => {
    matrixCells[b] = {};
    weights.forEach((w) => {
      matrixCells[b][w] = { sold: 0, stock: 0, sales3M: 0, sales6M: 0, sales1Y: 0, sales2Y: 0, moveIn: 0, moveOut: 0, netMove: 0 };
    });
  });

  // Track multi-period and age statistics per record
  const branchPeriodSold: Record<string, { m3: number; m6: number; y1: number; y2: number }> = {};
  const branchAgingMap: Record<string, { fresh: number; aging: number; slow: number; old: number; dormant: number }> = {};
  const weightPeriodSold: Record<string, { m3: number; m6: number; y1: number; y2: number; totalAge: number; ageCount: number }> = {};

  branches.forEach(b => {
    branchPeriodSold[b] = { m3: 0, m6: 0, y1: 0, y2: 0 };
    branchAgingMap[b] = { fresh: 0, aging: 0, slow: 0, old: 0, dormant: 0 };
  });

  weights.forEach(w => {
    weightPeriodSold[w] = { m3: 0, m6: 0, y1: 0, y2: 0, totalAge: 0, ageCount: 0 };
  });

  records.forEach((r) => {
    if (!matrixCells[r.branch]) matrixCells[r.branch] = {};
    if (!matrixCells[r.branch][r.weight]) {
      matrixCells[r.branch][r.weight] = { sold: 0, stock: 0, sales3M: 0, sales6M: 0, sales1Y: 0, sales2Y: 0, moveIn: 0, moveOut: 0, netMove: 0 };
    }

    const sold = Number(r.soldQty) || 0;
    const stock = Number(r.currentStock) || 0;

    // Multi-period sales resolution
    const s3m = r.sales3M !== undefined ? r.sales3M : Math.max(0, Math.round(sold * 0.4));
    const s6m = r.sales6M !== undefined ? r.sales6M : Math.max(0, Math.round(sold * 0.7));
    const s1y = r.sales1Y !== undefined ? r.sales1Y : sold;
    const s2y = r.sales2Y !== undefined ? r.sales2Y : Math.max(0, Math.round(sold * 1.8));

    // Inventory Age in Days
    const ageDays = r.ageDays !== undefined ? r.ageDays : (stock > 0 && sold === 0 ? 310 : 65);

    // Active timeframe sold for matrix
    // When user uploads e.g. 9-month data, soldQty is the full-period total (stored as sales1Y).
    let activeTimeframeSold = s1y;
    if (selectedTimeframe === '1M') activeTimeframeSold = Math.max(0, Math.round(s3m / 3));
    else if (selectedTimeframe === '3M') activeTimeframeSold = s3m;
    else if (selectedTimeframe === '6M') activeTimeframeSold = s6m;
    else if (selectedTimeframe === '9M') activeTimeframeSold = Math.max(0, s1y || sold); // upload total = 9-month sold
    else if (selectedTimeframe === '2Y') activeTimeframeSold = s2y;

    matrixCells[r.branch][r.weight].sold += activeTimeframeSold;
    matrixCells[r.branch][r.weight].stock += stock;
    matrixCells[r.branch][r.weight].sales3M = (matrixCells[r.branch][r.weight].sales3M || 0) + s3m;
    matrixCells[r.branch][r.weight].sales6M = (matrixCells[r.branch][r.weight].sales6M || 0) + s6m;
    matrixCells[r.branch][r.weight].sales1Y = (matrixCells[r.branch][r.weight].sales1Y || 0) + s1y;
    matrixCells[r.branch][r.weight].sales2Y = (matrixCells[r.branch][r.weight].sales2Y || 0) + s2y;

    if (branchPeriodSold[r.branch]) {
      branchPeriodSold[r.branch].m3 += s3m;
      branchPeriodSold[r.branch].m6 += s6m;
      branchPeriodSold[r.branch].y1 += s1y;
      branchPeriodSold[r.branch].y2 += s2y;
    }

    if (branchAgingMap[r.branch] && stock > 0) {
      if (ageDays <= 90) branchAgingMap[r.branch].fresh += stock;
      else if (ageDays <= 180) branchAgingMap[r.branch].aging += stock;
      else if (ageDays <= 365) branchAgingMap[r.branch].slow += stock;
      else if (ageDays <= 730) branchAgingMap[r.branch].old += stock;
      else branchAgingMap[r.branch].dormant += stock;
    }

    if (weightPeriodSold[r.weight]) {
      weightPeriodSold[r.weight].m3 += s3m;
      weightPeriodSold[r.weight].m6 += s6m;
      weightPeriodSold[r.weight].y1 += s1y;
      weightPeriodSold[r.weight].y2 += s2y;
      if (stock > 0) {
        weightPeriodSold[r.weight].totalAge += ageDays * stock;
        weightPeriodSold[r.weight].ageCount += stock;
      }
    }
  });

  // Track weight-level company metrics
  const weightMetricsMap: Record<string, {
    sold: number;
    stock: number;
    moveIn: number;
    moveOut: number;
    unmetShortage: number;
  }> = {};

  weights.forEach((w) => {
    weightMetricsMap[w] = { sold: 0, stock: 0, moveIn: 0, moveOut: 0, unmetShortage: 0 };
  });

  branches.forEach((b) => {
    weights.forEach((w) => {
      const cell = matrixCells[b][w];
      weightMetricsMap[w].sold += cell.sold;
      weightMetricsMap[w].stock += cell.stock;
    });
  });

  // Automated Redistribution Matching Engine
  const transferOrders: TransferOrder[] = [];
  const procurementOrders: ProcurementOrder[] = [];

  weights.forEach((w) => {
    // Rebuild every matrix/report mode from the same DWL-inclusive live pool.
    const retail = branches.filter(b => !isWarehouseBranch(b));
    const companyStock = branches.reduce((s, b) => s + Math.max(0, matrixCells[b][w].stock || 0), 0);
    const totalSales = retail.reduce((s, b) => s + Math.max(0, matrixCells[b][w].sales1Y || matrixCells[b][w].sold || 0), 0);
    const drafts = retail.map(branch => {
      const c = matrixCells[branch][w]; const sold = Math.max(0, c.sales1Y || c.sold || 0);
      // Baseline = period sales coverage at branch; Contribution = share of full pool (DWL+branches)
      const baseline = Math.max(0, Math.round(sold));
      const contribution = totalSales ? companyStock * sold / totalSales : 0;
      return { branch, sold, target: allocationMode === 'contribution' ? contribution : allocationMode === 'baseline' ? baseline : Math.max(contribution, baseline) };
    });
    const totalTarget = drafts.reduce((s, x) => s + x.target, 0);
    const factor = allocationMode === 'hybrid' && totalTarget > companyStock && totalTarget ? companyStock / totalTarget : 1;
    const donors: { branch: string; qty: number; warehouse: boolean }[] = [];
    const receivers: { branch: string; qty: number; sold: number }[] = [];
    branches.forEach(branch => {
      const current = Math.max(0, Math.round(matrixCells[branch][w].stock || 0));
      if (isWarehouseBranch(branch)) { if (current) donors.push({ branch, qty: current, warehouse: true }); return; }
      const d = drafts.find(x => x.branch === branch)!; const net = Math.round(d.target * factor) - current;
      if (net > 0) receivers.push({ branch, qty: net, sold: d.sold }); else if (net < 0) donors.push({ branch, qty: -net, warehouse: false });
    });
    donors.sort((a, b) => Number(b.warehouse) - Number(a.warehouse) || b.qty - a.qty); receivers.sort((a, b) => b.sold - a.sold || b.qty - a.qty);
    let donorIndex = 0;
    receivers.forEach(receiver => { while (receiver.qty > 0 && donorIndex < donors.length) {
      const donor = donors[donorIndex]; const qty = Math.min(donor.qty, receiver.qty);
      transferOrders.push({ id: `TR-${w.replace(/[^a-zA-Z0-9]/g, '')}-${donor.branch.substring(0, 3)}-${receiver.branch.substring(0, 3)}`, weight: w, fromBranch: donor.branch, toBranch: receiver.branch, qty, priority: receiver.sold > 0 ? 'HIGH' : 'MEDIUM', reason: `${allocationMode} matrix allocation target`, impactScore: receiver.sold, status: 'RECOMMENDED' });
      matrixCells[donor.branch][w].moveOut += qty; matrixCells[donor.branch][w].netMove -= qty; matrixCells[receiver.branch][w].moveIn += qty; matrixCells[receiver.branch][w].netMove += qty; weightMetricsMap[w].moveIn += qty; weightMetricsMap[w].moveOut += qty;
      donor.qty -= qty; receiver.qty -= qty; if (donor.qty === 0) donorIndex++;
    }});
    const unmet = receivers.reduce((s, x) => s + x.qty, 0);
    if (unmet) { weightMetricsMap[w].unmetShortage = unmet; procurementOrders.push({ weight: w, qtyToBuy: unmet, soldDemand: totalSales, availableStock: companyStock, urgency: 'HIGH', rationale: `${allocationMode} target exceeds DWL and branch stock.` }); }
    return;

    // 1. Identify deficits (branches that need stock moved IN)
    // 2. Identify surpluses (branches with excess/idle stock that can move OUT)
    const deficits: { branch: string; deficitQty: number; sold: number; stock: number; priorityScore: number }[] = [];
    const surpluses: { branch: string; surplusQty: number; sold: number; stock: number; isWarehouse: boolean }[] = [];

    branches.forEach((b) => {
      const isWarehouse = isWarehouseBranch(b);
      const cell = matrixCells[b][w];

      if (isWarehouse) {
        if (cell.stock > 0) {
          surpluses.push({
            branch: b,
            surplusQty: cell.stock,
            sold: cell.sold,
            stock: cell.stock,
            isWarehouse: true
          });
        }
        return;
      }

      // Deficit evaluation:
      // Case A: Complete stockout with active sales (critical deficit = sold quantity)
      if (cell.stock === 0 && cell.sold > 0) {
        deficits.push({
          branch: b,
          deficitQty: Math.max(1, cell.sold),
          sold: cell.sold,
          stock: cell.stock,
          priorityScore: cell.sold * 10 + 50 // highest urgency
        });
      }
      // Case B: Demand exceeds current stock (stock shortage = sold - stock)
      else if (cell.sold > cell.stock) {
        const shortQty = cell.sold - cell.stock;
        deficits.push({
          branch: b,
          deficitQty: shortQty,
          sold: cell.sold,
          stock: cell.stock,
          priorityScore: cell.sold * 10
        });
      }

      // Surplus evaluation:
      // Case C: Idle stock with zero sales in period (100% can move OUT)
      if (cell.stock > 0 && cell.sold === 0) {
        surpluses.push({
          branch: b,
          surplusQty: cell.stock,
          sold: cell.sold,
          stock: cell.stock,
          isWarehouse: false
        });
      }
      // Case D: Overstock where stock exceeds sales velocity
      // Keep a buffer equal to sales (or min 1 display piece), the rest is excess to move OUT
      else if (cell.stock > cell.sold) {
        const buffer = Math.max(1, cell.sold);
        const excess = cell.stock - buffer;
        if (excess > 0) {
          surpluses.push({
            branch: b,
            surplusQty: excess,
            sold: cell.sold,
            stock: cell.stock,
            isWarehouse: false
          });
        }
      }
    });

    // Sort deficits: highest urgency & sales demand first
    deficits.sort((a, b) => b.priorityScore - a.priorityScore || b.deficitQty - a.deficitQty);

    // Sort surpluses: warehouse first, then highest idle surplus stock first
    surpluses.sort((a, b) => {
      if (a.isWarehouse && !b.isWarehouse) return -1;
      if (!a.isWarehouse && b.isWarehouse) return 1;
      return b.surplusQty - a.surplusQty;
    });

    let dIndex = 0;
    let sIndex = 0;

    while (dIndex < deficits.length && sIndex < surpluses.length) {
      const currentDeficit = deficits[dIndex];
      const currentSurplus = surpluses[sIndex];
      const transferQty = Math.min(currentDeficit.deficitQty, currentSurplus.surplusQty);

      if (transferQty > 0) {
        transferOrders.push({
          id: `TR-${w.replace('.', '')}-${currentSurplus.branch.substring(0, 3).toUpperCase()}-${currentDeficit.branch.substring(0, 3).toUpperCase()}`,
          weight: w,
          fromBranch: currentSurplus.branch,
          toBranch: currentDeficit.branch,
          qty: transferQty,
          priority: currentDeficit.sold >= 2 ? 'CRITICAL' : 'HIGH',
          reason: currentSurplus.isWarehouse
            ? `Central Warehouse replenishment to meet ${currentDeficit.sold} sales demand at ${currentDeficit.branch}`
            : `Reallocate ${transferQty} pcs excess/idle stock from ${currentSurplus.branch} to stockout store ${currentDeficit.branch}`,
          impactScore: currentDeficit.sold * 10,
          status: 'RECOMMENDED'
        });

        matrixCells[currentSurplus.branch][w].moveOut += transferQty;
        matrixCells[currentSurplus.branch][w].netMove -= transferQty;

        matrixCells[currentDeficit.branch][w].moveIn += transferQty;
        matrixCells[currentDeficit.branch][w].netMove += transferQty;

        weightMetricsMap[w].moveIn += transferQty;
        weightMetricsMap[w].moveOut += transferQty;

        currentDeficit.deficitQty -= transferQty;
        currentSurplus.surplusQty -= transferQty;
      }

      if (currentDeficit.deficitQty <= 0) dIndex++;
      if (currentSurplus.surplusQty <= 0) sIndex++;
    }

    let remainingDeficit = 0;
    for (let i = dIndex; i < deficits.length; i++) {
      remainingDeficit += deficits[i].deficitQty;
    }

    const companyTotalSold = weightMetricsMap[w].sold;
    const companyTotalStock = weightMetricsMap[w].stock;
    const directShortage = Math.max(0, companyTotalSold - companyTotalStock);
    const finalUnmet = Math.max(remainingDeficit, directShortage);

    if (finalUnmet > 0) {
      weightMetricsMap[w].unmetShortage = finalUnmet;
      procurementOrders.push({
        weight: w,
        qtyToBuy: finalUnmet,
        soldDemand: companyTotalSold,
        availableStock: companyTotalStock,
        urgency: companyTotalSold >= 3 ? 'HIGH' : 'MEDIUM',
        rationale: `Total demand (${companyTotalSold} ${activeCategory.itemUnit}) exceeds total network stock (${companyTotalStock} ${activeCategory.itemUnit}). Intra-branch transfers exhausted.`
      });
    }
  });

  // Compile Branch Summaries
  const branchSummaries: BranchSummary[] = branches.map((b) => {
    let totalSold = 0;
    let totalCurrentStock = 0;
    let totalMoveIn = 0;
    let totalMoveOut = 0;
    let variantsNeedingAction = 0;

    weights.forEach((w) => {
      const cell = matrixCells[b][w];
      totalSold += cell.sold;
      totalCurrentStock += cell.stock;
      totalMoveIn += cell.moveIn;
      totalMoveOut += cell.moveOut;

      if (cell.moveIn > 0 || cell.moveOut > 0) {
        variantsNeedingAction++;
      }
    });

    const isWarehouse = isWarehouseBranch(b);
    const netChange = totalMoveIn - totalMoveOut;
    const sellThroughRate = (totalSold + totalCurrentStock) > 0
      ? (totalSold / (totalSold + totalCurrentStock)) * 100
      : 0;

    const overstockScore = totalSold === 0 && totalCurrentStock > 0
      ? totalCurrentStock * 20
      : Math.max(0, totalCurrentStock - totalSold) * 10;

    const shortageScore = totalCurrentStock === 0 && totalSold > 0
      ? totalSold * 25
      : Math.max(0, totalSold - totalCurrentStock) * 12;

    let status: BranchSummary['status'] = 'BALANCED';
    if (isWarehouse) {
      status = 'WAREHOUSE';
    } else if (totalCurrentStock === 0 && totalSold > 0) {
      status = 'SHORTAGE';
    } else if (totalMoveIn > totalMoveOut && totalMoveIn >= 2) {
      status = 'SHORTAGE';
    } else if (totalSold === 0 && totalCurrentStock > 0) {
      status = 'OVERSTOCKED';
    } else if (totalMoveOut > totalMoveIn && totalMoveOut >= 2) {
      status = 'OVERSTOCKED';
    }

    const bAging = branchAgingMap[b] || { fresh: 0, aging: 0, slow: 0, old: 0, dormant: 0 };
    const bPeriods = branchPeriodSold[b] || { m3: 0, m6: 0, y1: 0, y2: 0 };

    return {
      branch: b,
      totalSold,
      totalSold3M: bPeriods.m3,
      totalSold6M: bPeriods.m6,
      totalSold1Y: bPeriods.y1,
      totalSold2Y: bPeriods.y2,
      totalCurrentStock,
      totalMoveIn,
      totalMoveOut,
      netChange,
      variantsNeedingAction,
      isWarehouse,
      sellThroughRate,
      overstockScore,
      shortageScore,
      status,
      agingBreakdown: {
        freshPcs: bAging.fresh,
        agingPcs: bAging.aging,
        slowPcs: bAging.slow,
        oldPcs: bAging.old,
        dormantPcs: bAging.dormant
      }
    };
  });

  // Compile Weight Summaries
  const weightSummaries: WeightSummary[] = weights.map((w) => {
    const wm = weightMetricsMap[w];
    const weightNum = parseFloat(w) || 0;
    const wPeriods = weightPeriodSold[w] || { m3: 0, m6: 0, y1: 0, y2: 0, totalAge: 0, ageCount: 0 };

    let velocityCategory: WeightSummary['velocityCategory'] = 'Slow-Moving';
    if (wm.sold >= 3) velocityCategory = 'Best-Seller';
    else if (wm.sold >= 1) velocityCategory = 'Steady';
    else if (wm.stock > 0 && wm.sold === 0) velocityCategory = 'Zero-Sales Stock';

    const turnoverRatio = wm.stock > 0 ? (wm.sold / wm.stock) : (wm.sold > 0 ? 5 : 0);
    const avgAge = wPeriods.ageCount > 0 ? Math.round(wPeriods.totalAge / wPeriods.ageCount) : 60;

    return {
      weight: w,
      weightNum,
      soldQty: wm.sold,
      sold3M: wPeriods.m3,
      sold6M: wPeriods.m6,
      sold1Y: wPeriods.y1,
      sold2Y: wPeriods.y2,
      currentStock: wm.stock,
      moveInNeeded: wm.moveIn,
      moveOutNeeded: wm.moveOut,
      unmetShortage: wm.unmetShortage,
      velocityCategory,
      turnoverRatio,
      averageAgeDays: avgAge
    };
  });

  // Top rankings
  const retailBranches = branchSummaries.filter((b) => !b.isWarehouse);

  // Top 5 Selling Outlets
  const top5SellingBranches = [...retailBranches]
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, 5);

  // Lowest 5 Selling Outlets (Slow performers with idle stock)
  const lowest5SellingBranches = [...retailBranches]
    .sort((a, b) => a.totalSold - b.totalSold || b.totalCurrentStock - a.totalCurrentStock)
    .slice(0, 5);

  const topOverstockedBranches = [...branchSummaries]
    .filter((b) => !b.isWarehouse && b.totalCurrentStock > 0)
    .sort((a, b) => b.overstockScore - a.overstockScore)
    .slice(0, 5);

  const topShortageBranches = [...branchSummaries]
    .filter((b) => !b.isWarehouse)
    .sort((a, b) => b.shortageScore - a.shortageScore)
    .slice(0, 5);

  const top5BestSellingWeights = [...weightSummaries]
    .sort((a, b) => b.soldQty - a.soldQty)
    .slice(0, 5);

  const top5SlowMovingWeights = [...weightSummaries]
    .filter((w) => w.currentStock > 0 && w.soldQty === 0)
    .sort((a, b) => b.currentStock - a.currentStock)
    .slice(0, 5);

  const lowest5SellingWeights = [...weightSummaries]
    .sort((a, b) => a.soldQty - b.soldQty || b.currentStock - a.currentStock)
    .slice(0, 5);

  // Global Totals
  const totalSold = branchSummaries.reduce((sum, b) => sum + b.totalSold, 0);
  const totalSold3M = branchSummaries.reduce((sum, b) => sum + (b.totalSold3M || 0), 0);
  const totalSold6M = branchSummaries.reduce((sum, b) => sum + (b.totalSold6M || 0), 0);
  const totalSold1Y = branchSummaries.reduce((sum, b) => sum + (b.totalSold1Y || 0), 0);
  const totalSold2Y = branchSummaries.reduce((sum, b) => sum + (b.totalSold2Y || 0), 0);
  const totalCurrentStock = branchSummaries.reduce((sum, b) => sum + b.totalCurrentStock, 0);
  const totalMoveIn = branchSummaries.reduce((sum, b) => sum + b.totalMoveIn, 0);
  const totalMoveOut = branchSummaries.reduce((sum, b) => sum + b.totalMoveOut, 0);
  const netStockPosition = totalMoveIn - totalMoveOut;
  const totalNewStockToBuy = procurementOrders.reduce((sum, p) => sum + p.qtyToBuy, 0);
  const variantsNeedingActionCount = transferOrders.length + procurementOrders.length;

  // Build Comprehensive Stock Aging Analysis Buckets
  let totalPiecesFresh = 0;
  let totalPiecesAging = 0;
  let totalPiecesSlow = 0;
  let totalPiecesOld = 0;
  let totalPiecesDormant = 0;

  const trapped0_90: any[] = [];
  const trapped91_180: any[] = [];
  const trapped181_365: any[] = [];
  const trapped1_2y: any[] = [];
  const trapped2y_plus: any[] = [];

  records.forEach((r) => {
    const stock = Number(r.currentStock) || 0;
    if (stock <= 0) return;
    const sold = Number(r.soldQty) || 0;
    const age = r.ageDays !== undefined ? r.ageDays : (sold === 0 ? 310 : 65);

    const itemData = {
      branch: r.branch,
      weight: r.weight,
      qty: stock,
      daysOld: age,
      salesInBranch: sold
    };

    if (age <= 90) {
      totalPiecesFresh += stock;
      trapped0_90.push(itemData);
    } else if (age <= 180) {
      totalPiecesAging += stock;
      trapped91_180.push(itemData);
    } else if (age <= 365) {
      totalPiecesSlow += stock;
      if (sold === 0) trapped181_365.push(itemData);
    } else if (age <= 730) {
      totalPiecesOld += stock;
      if (sold === 0) trapped1_2y.push(itemData);
    } else {
      totalPiecesDormant += stock;
      trapped2y_plus.push(itemData);
    }
  });

  const totalStockForAging = Math.max(1, totalCurrentStock);

  const agingBuckets: StockAgingBucket[] = [
    {
      bucket: "0-90 Days",
      description: "Fresh Inventory (High customer turnover window)",
      totalPieces: totalPiecesFresh,
      percentage: Math.round((totalPiecesFresh / totalStockForAging) * 100),
      status: 'HEALTHY',
      affectedBranchesCount: new Set(trapped0_90.map(t => t.branch)).size,
      trappedItems: trapped0_90.slice(0, 5)
    },
    {
      bucket: "91-180 Days",
      description: "Normal Holding Period (Requires monitoring)",
      totalPieces: totalPiecesAging,
      percentage: Math.round((totalPiecesAging / totalStockForAging) * 100),
      status: 'MODERATE',
      affectedBranchesCount: new Set(trapped91_180.map(t => t.branch)).size,
      trappedItems: trapped91_180.slice(0, 5)
    },
    {
      bucket: "181-365 Days",
      description: "Slow-Moving Inventory (Should rotate between outlets)",
      totalPieces: totalPiecesSlow,
      percentage: Math.round((totalPiecesSlow / totalStockForAging) * 100),
      status: 'ATTENTION',
      affectedBranchesCount: new Set(trapped181_365.map(t => t.branch)).size,
      trappedItems: trapped181_365.slice(0, 6)
    },
    {
      bucket: "1-2 Years",
      description: "Stagnant Stock (Locked capital in idle locations)",
      totalPieces: totalPiecesOld,
      percentage: Math.round((totalPiecesOld / totalStockForAging) * 100),
      status: 'CRITICAL',
      affectedBranchesCount: new Set(trapped1_2y.map(t => t.branch)).size,
      trappedItems: trapped1_2y.slice(0, 6)
    },
    {
      bucket: ">2 Years",
      description: "Dormant / Dead Stock (Urgent transfer or remake needed)",
      totalPieces: totalPiecesDormant,
      percentage: Math.round((totalPiecesDormant / totalStockForAging) * 100),
      status: 'DEAD_STOCK',
      affectedBranchesCount: new Set(trapped2y_plus.map(t => t.branch)).size,
      trappedItems: trapped2y_plus.slice(0, 6)
    }
  ];

  // Consignment & New Shipment Planner (Products that will boost sales)
  const consignmentRecommendations: ConsignmentRecommendation[] = [];

  weightSummaries.forEach((w) => {
    const totalSold1Y = w.sold1Y || w.soldQty;
    const stock = w.currentStock;
    const demandDeficit = Math.max(0, totalSold1Y - stock);
    const isCriticalStockout = stock === 0 && totalSold1Y > 0;
    const isUnderstocked = stock > 0 && totalSold1Y >= stock;

    if (isCriticalStockout || isUnderstocked || (totalSold1Y >= 2 && stock <= 1)) {
      const recommendedQty = isCriticalStockout
        ? Math.max(2, Math.round(totalSold1Y * 2))
        : Math.max(2, Math.round(totalSold1Y * 1.5) - stock);
      const estimatedUnitPrice = activeCategory.estimatedAvgUnitPrice || 45000;
      const projectedSalesUplift = recommendedQty * estimatedUnitPrice * 0.85;

      consignmentRecommendations.push({
        weight: w.weight,
        category: activeCategory.itemTypeNoun,
        currentNetworkStock: stock,
        recentSalesDemand: totalSold1Y,
        demandVelocity: totalSold1Y >= 5 ? 'VERY_HIGH' : (totalSold1Y >= 2 ? 'HIGH' : 'MODERATE'),
        stockoutRisk: stock === 0 ? 'CRITICAL' : (stock <= 1 ? 'HIGH' : 'MODERATE'),
        recommendedConsignmentPcs: Math.max(1, recommendedQty),
        estimatedSalesUpliftBdt: Math.round(projectedSalesUplift),
        marketReason: stock === 0
          ? `High market customer demand (${totalSold1Y} pcs sold out). Complete network stockout (0 pcs available). New procurement order required immediately to capture sales.`
          : `Proven customer demand (${totalSold1Y} pcs sold). Network stock (${stock} pcs) is depleted. Reordering ${recommendedQty} pcs will boost overall revenue.`
      });
    }
  });

  consignmentRecommendations.sort((a, b) => {
    if (a.stockoutRisk === 'CRITICAL' && b.stockoutRisk !== 'CRITICAL') return -1;
    if (b.stockoutRisk === 'CRITICAL' && a.stockoutRisk !== 'CRITICAL') return 1;
    return b.recentSalesDemand - a.recentSalesDemand;
  });

  // Actionable Alerts
  const actionAlerts: ActionAlert[] = [];

  if (topShortageBranches.length > 0 && topShortageBranches[0].totalCurrentStock === 0) {
    actionAlerts.push({
      id: "alert-shortage-1",
      type: "CRITICAL_SHORTAGE",
      title: `Critical Stockout at ${topShortageBranches[0].branch}`,
      description: `${topShortageBranches[0].branch} generated ${topShortageBranches[0].totalSold} units of demand for ${activeCategory.name} but has ZERO available units on shelves.`,
      branch: topShortageBranches[0].branch,
      actionText: `Execute Move IN of ${topShortageBranches[0].totalMoveIn || 1} ${activeCategory.itemUnit} immediately to prevent sales walkout.`,
      priority: "URGENT"
    });
  }

  if (topOverstockedBranches.length > 0 && topOverstockedBranches[0].totalSold === 0) {
    actionAlerts.push({
      id: "alert-overstock-1",
      type: "OVERSTOCK_WARNING",
      title: `Idle Capital Lockup at ${topOverstockedBranches[0].branch}`,
      description: `${topOverstockedBranches[0].branch} holds ${topOverstockedBranches[0].totalCurrentStock} ${activeCategory.itemUnit} inventory with 0 period sales, creating holding cost and capital lockup.`,
      branch: topOverstockedBranches[0].branch,
      actionText: `Authorize Move OUT transfer order to reallocate inventory to high-velocity locations.`,
      priority: "WARNING"
    });
  }

  if (consignmentRecommendations.length > 0) {
    const topRec = consignmentRecommendations[0];
    actionAlerts.push({
      id: "alert-consignment-1",
      type: "PROCUREMENT_REQUIRED",
      title: `Consignment Requisition: Import ${topRec.weight} ct (${topRec.recommendedConsignmentPcs} pcs)`,
      description: `High sales demand (${topRec.recentSalesDemand} sold) vs only ${topRec.currentNetworkStock} in network stock. Ordering new consignment will boost revenue by $${topRec.estimatedSalesUpliftBdt.toLocaleString()}.`,
      actionText: `Include in upcoming factory import order.`,
      priority: "URGENT"
    });
  }

  transferOrders.forEach((to, idx) => {
    if (idx < 2) {
      actionAlerts.push({
        id: `alert-transfer-${to.id}`,
        type: "TRANSFER_OPPORTUNITY",
        title: `Dispatch Transfer: ${to.weight} (${to.fromBranch} → ${to.toBranch})`,
        description: `Transfer ${to.qty} ${activeCategory.itemUnit} of ${to.weight} from overstocked branch (${to.fromBranch}) to stockout branch (${to.toBranch}).`,
        branch: to.toBranch,
        weight: to.weight,
        actionText: "Ready to print dispatch slip",
        priority: to.priority === 'CRITICAL' ? 'URGENT' : 'WARNING'
      });
    }
  });

  return {
    period,
    selectedTimeframe,
    specialMonths: specialMonths && specialMonths.length > 0 ? specialMonths : undefined,
    categoryConfig: activeCategory,
    totalSold,
    totalSold3M,
    totalSold6M,
    totalSold1Y,
    totalSold2Y,
    totalCurrentStock,
    totalMoveIn,
    totalMoveOut,
    netStockPosition,
    totalNewStockToBuy,
    variantsNeedingActionCount,
    branchSummaries,
    weightSummaries,
    top5SellingBranches,
    lowest5SellingBranches,
    topOverstockedBranches,
    topShortageBranches,
    top5BestSellingWeights,
    top5SlowMovingWeights,
    lowest5SellingWeights,
    transferOrders,
    procurementOrders,
    actionAlerts,
    agingBuckets,
    consignmentRecommendations,
    matrix: {
      branches,
      weights,
      cells: matrixCells
    }
  };
}

/**
 * Multi-mode "Have vs Deserve" allocation engine.
 *
 * DWL (and central/warehouse/hub) = company warehouse stock — NOT a retail outlet.
 * TOTAL_COMPANY_STOCK includes every branch + DWL for the selected item.
 *
 * Three switchable modes (top-bar buttons drive the whole app):
 *
 * 1. contribution — pure sales share:
 *      Deserve = TOTAL_COMPANY_STOCK × (branchSales / totalRetailSales)
 *
 * 2. baseline — Excel 3-month backup model:
 *      AVERAGE_SALES = sold / periodMonths
 *      Baseline = AVERAGE_SALES × 3
 *      SCALE = TOTAL_COMPANY_STOCK / Σ Baseline
 *      Final = SCALE>1 & stock≥baseline ? ROUND(Baseline×1.2) : ROUND(Baseline)
 *
 * 3. hybrid — max(contribution, baseline) then fair-compress to live stock
 *
 * Net_Move = Final_Demand − CURRENT_STOCK → "+N" / "-N" / "0"
 */
export function getOptionAllocationSummary(
  report: RedistributionReport,
  itemKey: string,
  timeframe: SalesTimeframe = '3M',
  growthMultiplier: number = 1.0,
  allocationMode: AllocationMode = 'contribution'
): OptionAllocationSummary {
  const branches = [...report.matrix.branches];
  const isWarehouseBranch = (branch: string) => {
    const lower = branch.toLowerCase().trim();
    return lower === 'dwl' ||
      lower.startsWith('dwl ') ||
      lower.endsWith(' dwl') ||
      lower.includes('warehouse') ||
      lower.includes('central') ||
      lower.includes('hub') ||
      lower.includes('distribution center') ||
      lower === 'dc' ||
      lower.endsWith(' dc');
  };

  const warehouseBranches = branches.filter(isWarehouseBranch);
  const retailBranches = branches.filter(b => !isWarehouseBranch(b));
  const cellFor = (branch: string) => report.matrix.cells[branch]?.[itemKey] || {
    sold: 0,
    stock: 0,
    sales3M: 0,
    sales6M: 0,
    sales1Y: 0,
    sales2Y: 0,
    moveIn: 0,
    moveOut: 0,
    netMove: 0
  };

  const periodMonths =
    timeframe === '1M' ? 1 :
    timeframe === '3M' ? 3 :
    timeframe === '6M' ? 6 :
    timeframe === '9M' ? 9 :
    timeframe === '2Y' ? 24 : 12;

  // Festival / Exhibition / Promotion months must not inflate normal average.
  // Assume special months sell ~1.8× normal month → normalize baseline run-rate.
  const specialCount = Math.min(
    periodMonths - 1,
    Math.max(0, (report.specialMonths && report.specialMonths.length) || 0)
  );
  const FESTIVAL_LIFT_FACTOR = 1.8;
  const effectiveDivisor =
    specialCount > 0
      ? periodMonths + (FESTIVAL_LIFT_FACTOR - 1) * specialCount
      : periodMonths;

  // TOTAL stock for this particular item across ALL outlets + DWL warehouse
  const totalCompanyStock = branches.reduce(
    (sum, branch) => sum + (Number(cellFor(branch).stock) || 0),
    0
  );
  const warehouseStock = warehouseBranches.reduce(
    (sum, branch) => sum + Math.max(0, Number(cellFor(branch).stock) || 0),
    0
  );

  const effectiveGrowth = Math.max(1, Number(growthMultiplier) || 1);

  const soldForTimeframe = (c: {
    sold: number; stock: number;
    sales3M?: number; sales6M?: number; sales1Y?: number; sales2Y?: number;
  }): number => {
    if (timeframe === '1M') return Math.max(0, Math.round((Number(c.sales3M) || 0) / 3));
    if (timeframe === '3M') return Math.max(0, Number(c.sales3M) || 0);
    if (timeframe === '6M') return Math.max(0, Number(c.sales6M) || 0);
    if (timeframe === '9M') {
      return Math.max(0, Number(c.sales1Y) || Number(c.sold) || Math.round((Number(c.sales3M) || 0) * 3));
    }
    if (timeframe === '2Y') return Math.max(0, Number(c.sales2Y) || 0);
    return Math.max(0, Number(c.sales1Y) || Number(c.sold) || 0);
  };

  type BranchDraft = {
    branch: string;
    currentStock: number;
    soldQty: number;
    salesPeriod: number;
    sales3M: number;
    sales6M: number;
    sales1Y: number;
    sales2Y: number;
    salesAvgMonthly: number;
    baselineDemand: number;
    isWarehouse: boolean;
  };

  const drafts: BranchDraft[] = branches.map(branch => {
    const c = cellFor(branch);
    const sold3M = Math.max(0, Number(c.sales3M) || 0);
    const sold6M = Math.max(0, Number(c.sales6M) || 0);
    const sold1Y = Math.max(0, Number(c.sales1Y) || 0);
    const sold2Y = Math.max(0, Number(c.sales2Y) || 0);
    const salesPeriod = soldForTimeframe(c);
    const currentStock = Math.max(0, Number(c.stock) || 0);
    // Normalized monthly average: festival months do not inflate baseline
    const salesAvgMonthly = effectiveDivisor > 0 ? salesPeriod / effectiveDivisor : 0;
    // Baseline = keep stock equal to uploaded period sales at that branch
    // (2-month upload → minimum 2 months coverage = salesPeriod pcs)
    const baselineDemand = Math.max(0, salesPeriod);

    return {
      branch,
      currentStock,
      soldQty: salesPeriod,
      salesPeriod,
      sales3M: sold3M,
      sales6M: sold6M,
      sales1Y: sold1Y,
      sales2Y: sold2Y,
      salesAvgMonthly,
      baselineDemand,
      isWarehouse: isWarehouseBranch(branch)
    };
  });

  const retailDrafts = drafts.filter(d => !d.isWarehouse);
  const totalRetailSales = retailDrafts.reduce((s, d) => s + d.salesPeriod, 0);
  const totalIdealBaseline = retailDrafts.reduce((s, d) => s + d.baselineDemand, 0);
  const scaleFactor = totalIdealBaseline > 0 ? totalCompanyStock / totalIdealBaseline : 1;

  // ── Compute raw Final Demand per mode ──────────────────────────────────
  const finalDemandMap: Record<string, number> = {};

  retailDrafts.forEach(d => {
    const salesShare = totalRetailSales > 0 ? d.salesPeriod / totalRetailSales : 0;
    // Mode 1: contribution — full company pool (incl DWL) by sales %
    const contributionDeserve = totalCompanyStock * salesShare;

    // Mode 2: baseline — Excel 3-month backup + optional 20% bonus
    let baselineFinal: number;
    if (scaleFactor > 1 && d.currentStock >= d.baselineDemand) {
      baselineFinal = Math.round(d.baselineDemand * 1.2 * effectiveGrowth);
    } else {
      baselineFinal = Math.round(d.baselineDemand);
    }

    let finalDemand: number;
    if (allocationMode === 'contribution') {
      finalDemand = contributionDeserve;
    } else if (allocationMode === 'baseline') {
      finalDemand = baselineFinal;
    } else {
      // hybrid: take the higher of contribution share and 3-month baseline
      finalDemand = Math.max(contributionDeserve, baselineFinal);
    }

    finalDemandMap[d.branch] = Math.max(0, finalDemand);
  });

  const totalRetailTarget = Object.values(finalDemandMap).reduce((s, n) => s + n, 0);
  const scaledCompressionFactor =
    totalRetailTarget > totalCompanyStock && totalRetailTarget > 0
      ? totalCompanyStock / totalRetailTarget
      : 1;

  // Integer allocation with fair compression when needed
  const roundedTargets: Record<string, number> = {};
  if (scaledCompressionFactor < 1) {
    let floorSum = 0;
    const ranked: { branch: string; frac: number; sales: number }[] = [];
    retailDrafts.forEach(d => {
      const scaled = finalDemandMap[d.branch] * scaledCompressionFactor;
      const floor = Math.floor(scaled);
      roundedTargets[d.branch] = floor;
      floorSum += floor;
      ranked.push({ branch: d.branch, frac: scaled - floor, sales: d.salesPeriod });
    });
    let remainder = Math.max(0, Math.floor(totalCompanyStock) - floorSum);
    ranked.sort((a, b) => b.frac - a.frac || b.sales - a.sales);
    for (const r of ranked) {
      if (remainder <= 0) break;
      roundedTargets[r.branch] += 1;
      remainder -= 1;
    }
  } else {
    // Largest-remainder for contribution fractions so sum equals totalCompanyStock
    if (allocationMode === 'contribution' && totalRetailSales > 0) {
      let floorSum = 0;
      const ranked: { branch: string; frac: number; sales: number }[] = [];
      retailDrafts.forEach(d => {
        const exact = finalDemandMap[d.branch];
        const floor = Math.floor(exact);
        roundedTargets[d.branch] = floor;
        floorSum += floor;
        ranked.push({ branch: d.branch, frac: exact - floor, sales: d.salesPeriod });
      });
      let remainder = Math.max(0, Math.floor(totalCompanyStock) - floorSum);
      ranked.sort((a, b) => b.frac - a.frac || b.sales - a.sales);
      for (const r of ranked) {
        if (remainder <= 0) break;
        roundedTargets[r.branch] += 1;
        remainder -= 1;
      }
    } else {
      retailDrafts.forEach(d => {
        roundedTargets[d.branch] = Math.max(0, Math.round(finalDemandMap[d.branch]));
      });
    }
  }

  const totalAssigned = Object.values(roundedTargets).reduce((s, n) => s + n, 0);
  // Remaining after retail assignment stays as DWL / enterprise protected reserve
  const protectedReserve = Math.max(0, Math.floor(totalCompanyStock - totalAssigned));
  const distributableWarehouseStock = Math.max(0, warehouseStock - Math.min(warehouseStock, protectedReserve));

  const totalEnterpriseSales3M = retailDrafts.reduce((sum, d) => sum + d.sales3M, 0);
  const modeLabel =
    allocationMode === 'contribution' ? 'Sales Contribution Share' :
    allocationMode === 'baseline' ? '3-Month Baseline + Scale' :
    'Hybrid (Contribution ∪ Baseline)';

  const rows: OptionAllocationRow[] = drafts.map(d => {
    if (d.isWarehouse) {
      return {
        branch: d.branch,
        currentStock: d.currentStock,
        soldQty: d.soldQty,
        salesPeriod: d.salesPeriod,
        sales3M: d.sales3M,
        sales6M: d.sales6M,
        sales1Y: d.sales1Y,
        sales2Y: d.sales2Y,
        salesAvgMonthly: Math.round(d.salesAvgMonthly * 100) / 100,
        salesContributionPct: 0,
        contributionDeserveQty: 0,
        safetyFloorQty: 0,
        deservedStock: 0,
        variance: d.currentStock,
        action: 'WITHDRAW' as const,
        actionQty: Math.max(0, d.currentStock - protectedReserve),
        status: 'WAREHOUSE' as const,
        statusFlag: '🏢' as const,
        scaledFactor: Math.round(scaleFactor * 1000) / 1000,
        rationale: `DWL / Warehouse. Total item pool ${totalCompanyStock} pcs includes this ${d.currentStock} pcs. Distributes to showrooms by ${modeLabel}. Protected reserve ${protectedReserve} pcs.`,
        capQty: undefined,
        growthTargetStock: 0,
        opportunityStock: 0
      };
    }

    const deservedStock = Math.max(0, roundedTargets[d.branch] || 0);
    const netMove = Math.round(deservedStock - d.currentStock);
    const variance = d.currentStock - deservedStock;
    const action: OptionAllocationRow['action'] =
      netMove > 0 ? 'SEND' : netMove < 0 ? 'WITHDRAW' : 'BALANCED';
    const status: OptionAllocationRow['status'] =
      netMove > 0 ? 'LESS_STOCK' : netMove < 0 ? 'OVERSTOCK' : 'BALANCED';
    const statusFlag: OptionAllocationRow['statusFlag'] =
      netMove > 0 ? '📉' : netMove < 0 ? '⚠️' : '✓';

    const salesShare = totalRetailSales > 0 ? d.salesPeriod / totalRetailSales : 0;
    const contributionDeserve = Math.round(totalCompanyStock * salesShare);
    const baselineRounded = Math.round(d.baselineDemand);

    return {
      branch: d.branch,
      currentStock: d.currentStock,
      soldQty: d.soldQty,
      salesPeriod: d.salesPeriod,
      sales3M: d.sales3M,
      sales6M: d.sales6M,
      sales1Y: d.sales1Y,
      sales2Y: d.sales2Y,
      salesAvgMonthly: Math.round(d.salesAvgMonthly * 100) / 100,
      salesContributionPct: Math.round(salesShare * 1000) / 10,
      contributionDeserveQty: contributionDeserve,
      safetyFloorQty: baselineRounded,
      capQty: allocationMode === 'baseline' && scaleFactor > 1 && d.currentStock >= d.baselineDemand
        ? Math.round(d.baselineDemand * 1.2) : undefined,
      deservedStock,
      variance,
      action,
      actionQty: Math.abs(netMove),
      status,
      statusFlag,
      scaledFactor: Math.round((allocationMode === 'contribution' ? 1 : scaleFactor) * 1000) / 1000,
      rationale:
        allocationMode === 'contribution'
          ? `Sales share ${(salesShare * 100).toFixed(1)}% of total ${totalCompanyStock} pcs (incl. DWL) → deserve ${deservedStock} pcs.`
          : allocationMode === 'baseline'
            ? `Avg ${d.salesAvgMonthly.toFixed(1)}/mo × 3 = baseline ${baselineRounded}. Scale ${scaleFactor.toFixed(2)}× → final ${deservedStock} pcs.`
            : `Hybrid: contribution ${contributionDeserve} vs baseline ${baselineRounded} → final ${deservedStock} pcs of ${totalCompanyStock} pool.`,
      growthTargetStock: Math.round(d.baselineDemand * 1.2 * effectiveGrowth),
      opportunityStock: Math.max(0, deservedStock - d.currentStock)
    };
  });

  // Transfer pairs: overstock / DWL → understock
  const donors = rows
    .filter(r => r.action === 'WITHDRAW')
    .map(r => ({ branch: r.branch, qty: r.actionQty, isWh: r.status === 'WAREHOUSE' }))
    .sort((a, b) => {
      // Prefer DWL warehouse as first donor
      if (a.isWh && !b.isWh) return -1;
      if (!a.isWh && b.isWh) return 1;
      return b.qty - a.qty;
    });
  const receivers = rows
    .filter(r => r.action === 'SEND')
    .map(r => ({ branch: r.branch, qty: r.actionQty, sales: r.salesPeriod }))
    .sort((a, b) => b.sales - a.sales || b.qty - a.qty);

  const transferPairs: OptionAllocationSummary['transferPairs'] = [];
  let di = 0;
  let ri = 0;
  while (di < donors.length && ri < receivers.length) {
    const donor = donors[di];
    const receiver = receivers[ri];
    const qty = Math.min(donor.qty, receiver.qty);
    if (qty > 0) {
      transferPairs.push({
        fromBranch: donor.branch,
        toBranch: receiver.branch,
        qty,
        reason: donor.isWh
          ? `DWL warehouse releases ${qty} pcs to ${receiver.branch} (deserve gap).`
          : `${donor.branch} surplus ${qty} pcs → ${receiver.branch} Move IN.`
      });
      donor.qty -= qty;
      receiver.qty -= qty;
    }
    if (donor.qty <= 0) di++;
    if (receiver.qty <= 0) ri++;
  }

  const totalExcessToWithdraw = rows
    .filter(r => r.status === 'OVERSTOCK')
    .reduce((sum, r) => sum + r.actionQty, 0);
  const totalShortageToSend = rows
    .filter(r => r.status === 'LESS_STOCK')
    .reduce((sum, r) => sum + r.actionQty, 0);

  return {
    weight: itemKey,
    totalCompanyStock,
    totalSoldPeriod: drafts.reduce((sum, d) => sum + d.salesPeriod, 0),
    totalEnterpriseSales3M,
    totalRetailTargetBeforeCompression: Math.round(totalRetailTarget * 10) / 10,
    scaledCompressionFactor: Math.round(scaledCompressionFactor * 1000) / 1000,
    protectedReserve,
    distributableWarehouseStock,
    timeframe,
    allocationMode,
    growthMultiplier: effectiveGrowth,
    availableCompanyBuffer: protectedReserve,
    warehouseStock,
    rows: rows.sort(
      (a, b) => Math.abs(b.variance) - Math.abs(a.variance) || b.salesPeriod - a.salesPeriod
    ),
    totalExcessToWithdraw,
    totalShortageToSend,
    lowVelocityFloor: 0,
    highVelocityThreshold: 0,
    highVelocitySafetyMultiplier: 1.2,
    lowVelocityCapStock: 0,
    transferPairs
  };
}

/**
 * Parses raw CSV or TSV text uploaded by the user into RawInventoryRecord[]
 */
export function parseRawInventoryCSV(csvText: string): RawInventoryRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(/[,\t]/).map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ''));
  
  let branchIdx = headers.findIndex((h) => h.includes('branch'));
  let weightIdx = headers.findIndex((h) => h.includes('weight') || h.includes('particular') || h.includes('carat') || h.includes('size'));
  let soldIdx = headers.findIndex((h) => h.includes('sold') || h.includes('sales') || h.includes('soldqty'));
  let stockIdx = headers.findIndex((h) => h.includes('stock') || h.includes('currentstock') || h.includes('qty'));

  if (branchIdx === -1) branchIdx = 0;
  if (weightIdx === -1) weightIdx = 1;
  if (soldIdx === -1) soldIdx = 2;
  if (stockIdx === -1) stockIdx = 3;

  const records: RawInventoryRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[,\t]/).map((v) => v.trim().replace(/^["']|["']$/g, ''));
    if (row.length < 2) continue;

    const branch = row[branchIdx] || "Main Branch";
    let weight = row[weightIdx] || "0.25";
    if (!isNaN(parseFloat(weight))) {
      weight = parseFloat(weight).toFixed(2);
    }
    const soldQty = parseInt(row[soldIdx], 10) || 0;
    const currentStock = parseInt(row[stockIdx], 10) || 0;

    records.push({
      id: `raw-${i}-${Date.now()}`,
      branch,
      weight,
      soldQty,
      currentStock,
      sales3M: Math.max(0, Math.round(soldQty * 0.4)),
      sales6M: Math.max(0, Math.round(soldQty * 0.7)),
      sales1Y: soldQty,
      sales2Y: Math.max(0, Math.round(soldQty * 1.8)),
      ageDays: currentStock > 0 && soldQty === 0 ? 320 : 65
    });
  }

  return records;
}
