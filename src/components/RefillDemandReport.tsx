import React, { useState, useMemo } from 'react';
import { RedistributionReport } from '../types';
import {
  ShoppingBag,
  AlertTriangle,
  Flame,
  ArrowRight,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  DollarSign,
  Store,
  Filter,
  PackagePlus,
  HelpCircle,
  FileSpreadsheet,
  Calendar,
  Sliders,
  Calculator,
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface RefillDemandReportProps {
  report: RedistributionReport;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
}

export const RefillDemandReport: React.FC<RefillDemandReportProps> = ({
  report,
  onSelectBranch,
  onSelectWeight
}) => {
  // 1. Refill Logic Mode: 'full_upload' (default file analysis) OR 'target_months' (custom condition)
  const [refillMode, setRefillMode] = useState<'full_upload' | 'target_months'>('target_months');

  // 2. Baseline Uploaded Data Duration (in Months, default: 9 months as requested by user)
  const inferredBaselineMonths = useMemo(() => {
    const p = (report.period || '').trim();
    const m1 = p.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})\s*(?:to|-|–|—)\s*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/i);
    if (m1) {
      const from = new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
      const to = new Date(Number(m1[6]), Number(m1[5]) - 1, Number(m1[4]));
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        const days = Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(1, Math.round(days / 30.44));
      }
    }
    return 9; // Default 9 months baseline as described in prompt
  }, [report.period]);

  const [baselineUploadMonths, setBaselineUploadMonths] = useState<number>(inferredBaselineMonths);

  // 3. Custom Target Refill Months (1 to 12 months, or custom)
  const [targetMonths, setTargetMonths] = useState<number>(3); // default 3 months condition
  const [customMonthInput, setCustomMonthInput] = useState<string>('3');

  // 4. Replenishment Calculation Type:
  // - 'net_deficit': Refill Qty = Max(0, TargetDemand - CurrentStock)
  // - 'gross_sales': Refill Qty = TargetDemand (Replenish full sales volume)
  const [replenishmentMethod, setReplenishmentMethod] = useState<'net_deficit' | 'gross_sales'>('net_deficit');

  // 5. UI Filters
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Particular';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';
  const unitPrice = report.categoryConfig?.estimatedAvgUnitPrice || 250;
  const currency = report.categoryConfig?.currencySymbol || '$';

  // Handle setting target months
  const handleSelectMonths = (m: number) => {
    setTargetMonths(m);
    setCustomMonthInput(String(m));
    setRefillMode('target_months');
  };

  const handleCustomMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomMonthInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 36) {
      setTargetMonths(parsed);
      setRefillMode('target_months');
    }
  };

  // Compute refill items using either the standard analysis or the user's custom condition logic
  const refillItems = useMemo(() => {
    const activeBaseline = Math.max(1, baselineUploadMonths);

    return report.weightSummaries.map(w => {
      // Find branches requesting or selling this item
      const requestingBranches: { branch: string; sold: number; stock: number; shortage: number }[] = [];
      report.matrix.branches.forEach(b => {
        const cell = report.matrix.cells[b]?.[w.weight];
        if (cell && (cell.sold > 0 || cell.stock > 0)) {
          if (cell.sold > cell.stock) {
            requestingBranches.push({
              branch: b,
              sold: cell.sold,
              stock: cell.stock,
              shortage: cell.sold - cell.stock
            });
          }
        }
      });

      // Monthly average sales run-rate = Total uploaded sales / baseline upload months
      const monthlyAvgSales = w.soldQty / activeBaseline;

      let qtyToBuy = 0;
      let targetDemand = w.soldQty;
      let rationale = '';
      let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';

      if (refillMode === 'target_months') {
        // Condition logic specified by user:
        // "dhoren 3 mash select korle average sales 3 mash jog kore oi order korbe"
        // Target Demand for M months = Monthly Avg Sales * M
        targetDemand = Math.round(monthlyAvgSales * targetMonths);

        if (replenishmentMethod === 'net_deficit') {
          // Refill what is needed to reach target demand considering current stock
          qtyToBuy = Math.max(0, targetDemand - w.currentStock);
        } else {
          // Gross Sales Replenishment: refill exactly what is projected/sold for target months
          qtyToBuy = targetDemand;
        }

        // Urgency & Rationale
        if (w.currentStock === 0 && targetDemand > 0) {
          urgency = 'CRITICAL';
          rationale = `100% Stockout (Condition: ${targetMonths}M Refill): Run-rate is ${monthlyAvgSales.toFixed(2)} ${itemUnit}/mo based on ${w.soldQty} ${itemUnit} total sales over ${activeBaseline}-month upload. Total ${targetMonths}-month demand is ${targetDemand} ${itemUnit} with 0 stock in entire company. Order immediately to prevent lost sales.`;
        } else if (qtyToBuy > 0) {
          urgency = 'HIGH';
          rationale = `${targetMonths}-Month Target Refill: Average monthly sales = ${monthlyAvgSales.toFixed(2)} ${itemUnit}/mo (${activeBaseline}M baseline). ${targetMonths}-month demand sum = ${targetDemand} ${itemUnit}. Current company stock = ${w.currentStock} ${itemUnit}. ${
            replenishmentMethod === 'net_deficit'
              ? `Net shortage required: ${qtyToBuy} ${itemUnit}.`
              : `Full ${targetMonths}M volume reorder: ${qtyToBuy} ${itemUnit}.`
          }`;
        } else {
          urgency = 'MEDIUM';
          rationale = `Sufficient Inventory: Current stock (${w.currentStock} ${itemUnit}) satisfies projected ${targetMonths}-month demand of ${targetDemand} ${itemUnit}. No emergency procurement needed.`;
        }
      } else {
        // Default Upload File Sales Analysis
        qtyToBuy = Math.max(w.unmetShortage, w.soldQty > w.currentStock ? w.soldQty - w.currentStock : 0);

        if (w.currentStock === 0 && w.soldQty > 0) {
          urgency = 'CRITICAL';
          rationale = `100% Stockout (Full Upload Analysis): Customer demand was ${w.soldQty} ${itemUnit} across ${requestingBranches.length} branch(es), but entire company stock is 0. Internal transfer cannot resolve this. Immediate supplier refill order needed.`;
        } else if (w.unmetShortage > 0) {
          urgency = 'HIGH';
          rationale = `Demand Exceeds Inventory: ${w.soldQty} ${itemUnit} sold vs ${w.currentStock} in stock. Even after intra-branch transfers, net shortage is ${w.unmetShortage} ${itemUnit}. Refill required to maintain shelf presence.`;
        } else {
          urgency = 'MEDIUM';
          rationale = `Buffer Replenishment: Steady sales velocity of ${w.soldQty} ${itemUnit}. Refill recommended for upcoming cycle.`;
        }
      }

      const estCost = qtyToBuy * unitPrice;

      return {
        weight: w.weight,
        weightNum: w.weightNum,
        soldQty: w.soldQty,
        monthlyAvgSales,
        targetDemand,
        currentStock: w.currentStock,
        qtyToBuy,
        estCost,
        urgency,
        rationale,
        requestingBranches,
        turnoverRatio: w.turnoverRatio
      };
    })
    // Only display items that need refill or have customer sales
    .filter(item => {
      if (refillMode === 'target_months') {
        return item.qtyToBuy > 0 || (item.soldQty > 0 && item.currentStock === 0);
      }
      return item.qtyToBuy > 0 || (item.soldQty > 0 && item.currentStock === 0);
    })
    .sort((a, b) => {
      if (a.urgency === 'CRITICAL' && b.urgency !== 'CRITICAL') return -1;
      if (b.urgency === 'CRITICAL' && a.urgency !== 'CRITICAL') return 1;
      return b.qtyToBuy - a.qtyToBuy;
    });
  }, [report, refillMode, baselineUploadMonths, targetMonths, replenishmentMethod, itemUnit, unitPrice]);

  const filteredRefills = useMemo(() => {
    return refillItems.filter(item => {
      if (filterUrgency === 'CRITICAL' && item.urgency !== 'CRITICAL') return false;
      if (filterUrgency === 'HIGH' && item.urgency !== 'CRITICAL' && item.urgency !== 'HIGH') return false;
      if (searchKeyword) {
        const q = searchKeyword.toLowerCase();
        return (
          item.weight.toLowerCase().includes(q) ||
          item.requestingBranches.some(b => b.branch.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [refillItems, filterUrgency, searchKeyword]);

  const totalUnitsToRefill = useMemo(() => {
    return refillItems.reduce((sum, item) => sum + item.qtyToBuy, 0);
  }, [refillItems]);

  const totalTargetDemandUnits = useMemo(() => {
    return refillItems.reduce((sum, item) => sum + item.targetDemand, 0);
  }, [refillItems]);

  const totalEstimatedBudget = totalUnitsToRefill * unitPrice;
  const criticalItemsCount = refillItems.filter(i => i.urgency === 'CRITICAL').length;

  const handleExportExcel = () => {
    const rows: any[] = [
      [
        `SL`,
        `${itemLabel}`,
        `Uploaded Sold (${baselineUploadMonths}M)`,
        `Monthly Avg Run-Rate`,
        `Target Demand (${refillMode === 'target_months' ? `${targetMonths} Months` : 'Uploaded Period'})`,
        `Company Stock`,
        `Required Refill Qty (${itemUnit})`,
        `Urgency Priority`,
        `Estimated Budget (${currency})`,
        `Target Branches Needed`,
        `Replenishment Rationale & Condition Audit`
      ]
    ];

    filteredRefills.forEach((item, idx) => {
      const branchesStr = item.requestingBranches
        .map(b => `${b.branch} (+${b.shortage})`)
        .join(', ');
      rows.push([
        idx + 1,
        itemUnit === 'ct' ? `${item.weight} ct` : item.weight,
        item.soldQty,
        Number(item.monthlyAvgSales.toFixed(2)),
        item.targetDemand,
        item.currentStock,
        item.qtyToBuy,
        item.urgency,
        Math.round(item.estCost),
        branchesStr || 'Central Stock Pool',
        item.rationale
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Refill_Demand_Requisition');
    const fileName = refillMode === 'target_months'
      ? `Refill_Demand_${targetMonths}M_Sales_Condition_${Date.now()}.xlsx`
      : `Refill_Demand_Upload_Analysis_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card with Strategy & Month Selection */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#172554] to-[#1e1b4b] border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <PackagePlus className="w-4 h-4" />
              <span>Smart Stock Refill Demand &amp; Procurement Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Refill Demand &amp; Restock Forecasting</span>
              {refillMode === 'target_months' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Active: {targetMonths} Months Sales Rule
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload data analyzing <span className="font-semibold text-white">{baselineUploadMonths} months</span> of historical sales. Select a custom sales duration condition (1 to 12 months) or use the full uploaded analysis to trigger intelligent restock orders.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export Requisition (.xlsx)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print PO Sheet</span>
            </button>
          </div>
        </div>

        {/* CONDITION & MONTH SELECTION BAR (The core feature requested by user) */}
        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Mode Switch: Standard Upload File vs Target Months Condition */}
            <div className="flex items-center gap-2 bg-slate-950/70 p-1 rounded-xl border border-slate-700/80">
              <button
                onClick={() => setRefillMode('full_upload')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  refillMode === 'full_upload'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Default Upload Analysis ({baselineUploadMonths}M)</span>
              </button>
              <button
                onClick={() => setRefillMode('target_months')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  refillMode === 'target_months'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Custom Sales Condition (1-12 Months)</span>
              </button>
            </div>

            {/* Baseline Upload Duration Setting */}
            <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
              <span className="text-slate-400">Uploaded File Span:</span>
              <input
                type="number"
                min={1}
                max={36}
                value={baselineUploadMonths}
                onChange={e => setBaselineUploadMonths(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-amber-400 font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="text-slate-400">Months</span>
            </div>
          </div>

          {/* If Custom Condition is Active: Show Month Quick-Picks (1-12M) & Calculation Condition */}
          {refillMode === 'target_months' && (
            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-amber-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200 text-xs">
                    Select Target Sales Refill Duration (1 – 12 Months):
                  </span>
                </div>

                {/* Calculation Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setReplenishmentMethod('net_deficit')}
                    title="Target Demand minus Current Company Stock"
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      replenishmentMethod === 'net_deficit'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Net Deficit (Target - Stock)
                  </button>
                  <button
                    onClick={() => setReplenishmentMethod('gross_sales')}
                    title="Directly replenish full sales volume achieved over selected months"
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      replenishmentMethod === 'gross_sales'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gross Sales Replenishment (Full M-Month Sales)
                  </button>
                </div>
              </div>

              {/* Month Buttons: 1M to 12M + Custom Input */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => handleSelectMonths(m)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      targetMonths === m
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md scale-105'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    {m} {m === 1 ? 'Month' : 'Months'}
                  </button>
                ))}

                {/* Custom Month Stepper */}
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800">
                  <span className="text-[11px] text-slate-400">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={customMonthInput}
                    onChange={handleCustomMonthChange}
                    className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                    placeholder="Mo"
                  />
                  <span className="text-[11px] text-slate-400">Mo</span>
                </div>
              </div>

              {/* Formula & Operational Note */}
              <div className="flex items-start gap-2 text-[11px] text-amber-300/80 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <strong>Applied Formula Logic:</strong> Total {baselineUploadMonths}-month sales are divided by {baselineUploadMonths} to get the <em>Monthly Average Sales Run-rate</em> per item. That rate is multiplied by <strong>{targetMonths} months</strong> (sum of average sales for {targetMonths} months). Refill demand is then computed as{' '}
                  <span className="text-white font-mono">
                    {replenishmentMethod === 'net_deficit'
                      ? `Max(0, ${targetMonths}M Demand - Current Stock)`
                      : `Full ${targetMonths}M Demand`}
                  </span>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3 Top Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">
                {refillMode === 'target_months' ? `Refill Units Needed (${targetMonths}M Condition)` : 'Refill Units Needed (Upload Demand)'}
              </p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {totalUnitsToRefill} <span className="text-xs font-normal text-slate-400">{itemUnit}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target Sales: <strong className="text-slate-200">{totalTargetDemandUnits} {itemUnit}</strong>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Critical 0-Stock Items</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">
                {criticalItemsCount} <span className="text-xs font-normal text-slate-400">skus</span>
              </p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                Active customer sales with 0 stock
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 font-medium">Estimated Procurement Budget</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {currency}{totalEstimatedBudget.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Avg: {currency}{unitPrice} per {itemUnit}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterUrgency('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterUrgency === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Refills ({refillItems.length})
          </button>
          <button
            onClick={() => setFilterUrgency('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterUrgency === 'CRITICAL'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-500 hover:bg-rose-100 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>0-Stock Critical ({criticalItemsCount})</span>
          </button>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder={`Filter by ${itemLabel} or requesting branch...`}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Refill Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">{itemLabel}</th>
                <th className="py-3 px-3 text-center">
                  Uploaded Sold ({baselineUploadMonths}M)
                </th>
                <th className="py-3 px-3 text-center">
                  Monthly Avg
                </th>
                <th className="py-3 px-3 text-center bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                  {refillMode === 'target_months' ? `${targetMonths}M Target Demand` : 'Demand Target'}
                </th>
                <th className="py-3 px-3 text-center">Company Stock</th>
                <th className="py-3 px-3 text-center bg-amber-100/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-extrabold">
                  Qty to Refill
                </th>
                <th className="py-3 px-3 text-center">Priority</th>
                <th className="py-3 px-4 min-w-[280px]">Replenishment Justification &amp; Logic</th>
                <th className="py-3 px-4 min-w-[200px]">Branch Allocation Needed</th>
                <th className="py-3 px-3 text-right">Est. Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRefills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-70" />
                    No items require refill under this condition. Company stock is balanced.
                  </td>
                </tr>
              ) : (
                filteredRefills.map(item => (
                  <tr
                    key={item.weight}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Item / Carat Weight */}
                    <td
                      onClick={() => onSelectWeight?.(item.weight)}
                      title={`Click to view availability for ${item.weight}`}
                      className="py-3 px-4 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 text-sm font-mono hover:underline">
                          {itemUnit === 'ct' ? `${item.weight} ct` : item.weight}
                        </span>
                        {item.currentStock === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            ZERO STOCK
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer Sold (Uploaded Period) */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                        {item.soldQty} {itemUnit}
                      </span>
                    </td>

                    {/* Monthly Average Run-Rate */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {item.monthlyAvgSales.toFixed(2)}/mo
                    </td>

                    {/* Target Demand for M Months */}
                    <td className="py-3 px-3 text-center font-mono font-bold bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
                      {item.targetDemand} {itemUnit}
                    </td>

                    {/* Company Stock */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold border ${
                          item.currentStock === 0
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {item.currentStock} {itemUnit}
                      </span>
                    </td>

                    {/* Qty to Refill */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-sm border border-amber-300 dark:border-amber-500/40 font-mono">
                        +{item.qtyToBuy} {itemUnit}
                      </span>
                    </td>

                    {/* Priority Badge */}
                    <td className="py-3 px-3 text-center">
                      {item.urgency === 'CRITICAL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          CRITICAL
                        </span>
                      ) : item.urgency === 'HIGH' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                          HIGH
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          ROUTINE
                        </span>
                      )}
                    </td>

                    {/* Replenishment Rationale */}
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.rationale}
                    </td>

                    {/* Branch Allocation Needed */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {item.requestingBranches.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">Central Warehouse Reserve</span>
                        ) : (
                          item.requestingBranches.map(b => (
                            <button
                              key={b.branch}
                              onClick={() => onSelectBranch?.(b.branch)}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                              title={`Sold: ${b.sold}, Stock: ${b.stock}`}
                            >
                              <Store className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
                              <span>{b.branch}: <strong className="text-amber-600 dark:text-amber-400">+{b.shortage}</strong></span>
                            </button>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Est. Budget */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {currency}{Math.round(item.estCost).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logic Documentation & Strategic Insight */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Operational Business Logic for Stock Refill</span>
        </div>
        <p className="leading-relaxed">
          1. <strong>Custom Month Replenishment Horizon:</strong> When you specify e.g. <em>3 or 6 months</em>, the system extracts the baseline sales velocity from your upload (e.g. 9 months), computes the exact monthly run-rate, and projects the required sales units for that chosen duration.
        </p>
        <p className="leading-relaxed">
          2. <strong>Net Deficit vs. Gross Volume:</strong> In <em>Net Deficit</em> mode, current company inventory is deducted so you only buy what is missing. In <em>Gross Sales</em> mode, you reorder the full volume sold in that duration to completely restock shelves.
        </p>
        <p className="leading-relaxed">
          3. <strong>Immediate 0-Stock Resolution:</strong> Priority is always assigned first to items with verified sales demand and 0 stock anywhere in the company to avoid ongoing revenue loss.
        </p>
      </div>
    </div>
  );
};
