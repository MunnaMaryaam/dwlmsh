import React, { useState, useMemo, useEffect } from 'react';
import { RedistributionReport, RawInventoryRecord } from '../types';
import {
  Hourglass,
  Activity,
  Flame,
  AlertOctagon,
  Clock,
  ArrowRightLeft,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  ShieldAlert,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  RotateCw,
  Share2,
  Search,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Home
} from 'lucide-react';
import {
  getSavedSnapshots,
  ensureInitialHistoricalData,
  compareSnapshots,
  DailyInventorySnapshot,
  MovementAgingAnalysisResult
} from '../utils/dailyStorageEngine';

interface MovementAndAgingReportViewProps {
  report: RedistributionReport;
  rawRecords?: RawInventoryRecord[];
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
  onBackToHome?: () => void;
}

export const MovementAndAgingReportView: React.FC<MovementAndAgingReportViewProps> = ({
  report,
  rawRecords = [],
  onSelectBranch,
  onSelectWeight,
  onBackToHome
}) => {
  // Navigation tabs: 'daily_movement' | 'aging' | 'velocity'
  const [activeSubTab, setActiveSubTab] = useState<'daily_movement' | 'aging' | 'velocity'>('daily_movement');
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<string>('all');

  // Daily Storage & Snapshots state
  const [snapshots, setSnapshots] = useState<DailyInventorySnapshot[]>([]);
  const [prevSnapshotId, setPrevSnapshotId] = useState<string>('');
  const [currSnapshotId, setCurrSnapshotId] = useState<string>('');

  // Daily Movement search and filter
  const [movementSearch, setMovementSearch] = useState('');
  const [movementFilter, setMovementFilter] = useState<'ALL' | 'SOLD' | 'REPLENISHED' | 'STAGNANT'>('ALL');

  // Initialize snapshots on mount or when raw records update
  useEffect(() => {
    const list = ensureInitialHistoricalData(rawRecords);
    setSnapshots(list);
    if (list.length >= 2) {
      setCurrSnapshotId(list[0].id);
      setPrevSnapshotId(list[1].id);
    } else if (list.length === 1) {
      setCurrSnapshotId(list[0].id);
      setPrevSnapshotId(list[0].id);
    }
  }, [rawRecords]);

  // Compute Day-over-Day movement analysis
  const movementResult: MovementAgingAnalysisResult | null = useMemo(() => {
    if (snapshots.length < 2) return null;
    const curr = snapshots.find(s => s.id === currSnapshotId) || snapshots[0];
    const prev = snapshots.find(s => s.id === prevSnapshotId) || snapshots[1] || snapshots[0];
    return compareSnapshots(prev, curr);
  }, [snapshots, currSnapshotId, prevSnapshotId]);

  // Filter items in movement table
  const filteredMovementItems = useMemo(() => {
    if (!movementResult) return [];
    return movementResult.items.filter(item => {
      const matchesSearch =
        item.branch.toLowerCase().includes(movementSearch.toLowerCase()) ||
        item.weight.toLowerCase().includes(movementSearch.toLowerCase());
      let matchesFilter = true;
      if (movementFilter === 'SOLD') matchesFilter = item.detectedUnitsSold > 0;
      else if (movementFilter === 'REPLENISHED') matchesFilter = item.replenishedUnits > 0;
      else if (movementFilter === 'STAGNANT') matchesFilter = item.detectedUnitsSold === 0 && item.replenishedUnits === 0;
      return matchesSearch && matchesFilter;
    });
  }, [movementResult, movementSearch, movementFilter]);

  const agingBuckets = report.agingBuckets || [];
  const itemLabel = report.categoryConfig?.itemLabel || 'Item / SKU / Variant';

  const handleExportMovementCsv = () => {
    if (!movementResult) return;
    const headers = [
      'Branch',
      itemLabel,
      'Previous Stock',
      'Current Stock',
      'Stock Delta',
      'Detected Units Sold',
      'Days Between Audits',
      'Daily Sales Velocity',
      'Average Stock',
      'Estimated Days to Stockout',
      'Movement Status'
    ];

    const rows = movementResult.items.map(item => [
      `"${item.branch}"`,
      item.weight,
      item.previousStock,
      item.currentStock,
      item.stockDelta,
      item.detectedUnitsSold,
      item.daysBetween,
      item.dailySalesVelocity,
      item.averageStock,
      item.daysToStockout >= 999 ? 'N/A (No sales)' : item.daysToStockout,
      item.movementStatus
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Day_Over_Day_Movement_Audit_${movementResult.currentSnapshot.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="movement-aging-root">
      {/* Sub-navigation Switcher between Daily Movement, Aging, and Velocity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            {onBackToHome && (
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 hover:text-slate-950 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Return to Home / Executive Dashboard"
              >
                <Home className="w-3.5 h-3.5 text-indigo-600" />
                <span>← Back to Home</span>
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Inventory Movement & Stock Aging Analysis
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated daily movement tracking (previous vs current stock), sales detection, and aging duration buckets.
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('daily_movement')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'daily_movement'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Daily Movement Audit (Day-over-Day)
          </button>
          <button
            onClick={() => setActiveSubTab('aging')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'aging'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Aging Buckets (0-90D to &gt;2Y)
          </button>
          <button
            onClick={() => setActiveSubTab('velocity')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
              activeSubTab === 'velocity'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Product Velocity
          </button>
        </div>
      </div>

      {/* 1. DAILY MOVEMENT AUDIT (DAY-OVER-DAY) */}
      {activeSubTab === 'daily_movement' && (
        <div className="space-y-6">
          {/* Snapshot Comparison Control Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 rounded-2xl border border-indigo-900/50 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Automated Daily Audit Engine
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  Day-over-Day Stock Delta & Sales Detection
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Compares yesterday’s stock entry vs today’s live stock. If yesterday stock was 2 pcs and today is 1 pc, the engine calculates 1 pc sold, average stock, and run-rate velocity.
                </p>
              </div>

              {/* Snapshot Selectors */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Baseline Date</span>
                  <select
                    value={prevSnapshotId}
                    onChange={(e) => setPrevSnapshotId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-amber-500 outline-none"
                  >
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.displayDate} ({s.totalStock} pcs)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-slate-500 pt-3">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Audit Date</span>
                  <select
                    value={currSnapshotId}
                    onChange={(e) => setCurrSnapshotId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {snapshots.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.displayDate} ({s.totalStock} pcs)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Metric KPI Cards */}
            {movementResult && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Units Sold Detected</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-emerald-400">
                      {movementResult.totalUnitsSoldDetected}
                    </span>
                    <span className="text-xs text-slate-400">pcs sold</span>
                  </div>
                  <span className="text-[10px] text-emerald-300/80">
                    in {movementResult.daysBetween} day{movementResult.daysBetween > 1 ? 's' : ''} audit window
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Average Daily Velocity</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-amber-400">
                      {movementResult.averageDailySalesRunRate}
                    </span>
                    <span className="text-xs text-slate-400">pcs / day</span>
                  </div>
                  <span className="text-[10px] text-slate-400">across network</span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Average Stock Level</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-slate-100">
                      {movementResult.averageStockLevel}
                    </span>
                    <span className="text-xs text-slate-400">pcs</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    base {movementResult.previousSnapshot.totalStock} → now {movementResult.currentSnapshot.totalStock}
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-xs text-slate-400 block">Stagnant / Idle Items</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-rose-400">
                      {movementResult.stagnantItemsCount}
                    </span>
                    <span className="text-xs text-slate-400">SKUs</span>
                  </div>
                  <span className="text-[10px] text-rose-300/80">zero movement in period</span>
                </div>
              </div>
            )}
          </div>

          {/* Movement Table Card */}
          {movementResult && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Product-Level Movement & Sales Breakdown
                  </h4>
                  <p className="text-xs text-slate-500">
                    Itemized stock changes for {movementResult.previousSnapshot.displayDate} vs {movementResult.currentSnapshot.displayDate}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      placeholder="Search branch or item..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40 sm:w-48"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                    <button
                      onClick={() => setMovementFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        movementFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({movementResult.items.length})
                    </button>
                    <button
                      onClick={() => setMovementFilter('SOLD')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        movementFilter === 'SOLD' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sold Outflow
                    </button>
                    <button
                      onClick={() => setMovementFilter('REPLENISHED')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        movementFilter === 'REPLENISHED' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Replenished
                    </button>
                    <button
                      onClick={() => setMovementFilter('STAGNANT')}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                        movementFilter === 'STAGNANT' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Stagnant Idle
                    </button>
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportMovementCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-amber-400 hover:bg-slate-800 text-xs font-bold rounded-lg border border-slate-700 transition-colors shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Export Audit CSV
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Outlet / Branch</th>
                      <th className="py-2.5 px-3">{itemLabel}</th>
                      <th className="py-2.5 px-3 text-center">Previous Stock</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Stock Delta</th>
                      <th className="py-2.5 px-3 text-center text-emerald-700">Detected Sales</th>
                      <th className="py-2.5 px-3 text-center">Avg Stock</th>
                      <th className="py-2.5 px-3 text-center">Daily Velocity</th>
                      <th className="py-2.5 px-3 text-center">Est. Sellout Days</th>
                      <th className="py-2.5 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMovementItems.map((item, idx) => {
                      const isSold = item.detectedUnitsSold > 0;
                      const isReplenished = item.replenishedUnits > 0;

                      return (
                        <tr
                          key={`${item.branch}-${item.weight}-${idx}`}
                          onClick={() => {
                            if (onSelectBranch) onSelectBranch(item.branch);
                            if (onSelectWeight) onSelectWeight(item.weight);
                          }}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {item.branch}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.weight}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                            {item.previousStock} pcs
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {item.currentStock} pcs
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {item.stockDelta < 0 ? (
                              <span className="text-emerald-600 inline-flex items-center">
                                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                                {item.stockDelta}
                              </span>
                            ) : item.stockDelta > 0 ? (
                              <span className="text-indigo-600 inline-flex items-center">
                                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                +{item.stockDelta}
                              </span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-emerald-600 bg-emerald-50/40">
                            {isSold ? `+${item.detectedUnitsSold} pcs sold` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                            {item.averageStock} pcs
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-800">
                            {item.dailySalesVelocity > 0 ? `${item.dailySalesVelocity}/day` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            {item.daysToStockout < 999 ? (
                              <span className={item.daysToStockout <= 7 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {item.daysToStockout} days
                              </span>
                            ) : (
                              <span className="text-slate-400">No outflow</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {item.movementStatus === 'RAPID_OUTFLOW' && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                Rapid Sell-out
                              </span>
                            )}
                            {item.movementStatus === 'STEADY_MOVEMENT' && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                                Steady Movement
                              </span>
                            )}
                            {item.movementStatus === 'REPLENISHED' && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[10px]">
                                Inbound Stock
                              </span>
                            )}
                            {item.movementStatus === 'STAGNANT_IDLE' && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">
                                Stagnant Idle
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. AGING ANALYSIS TAB */}
      {activeSubTab === 'aging' && (
        <div className="space-y-6">
          {/* Executive Aging Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {agingBuckets.map((bucket) => {
              const isSelected = selectedAgingBucket === bucket.bucket;
              const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
                HEALTHY: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-800' },
                MODERATE: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-800' },
                ATTENTION: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-800' },
                CRITICAL: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', badge: 'bg-orange-100 text-orange-800' },
                DEAD_STOCK: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', badge: 'bg-rose-100 text-rose-800' }
              };
              const c = colorMap[bucket.status] || colorMap.MODERATE;

              return (
                <div
                  key={bucket.bucket}
                  onClick={() => setSelectedAgingBucket(isSelected ? 'all' : bucket.bucket)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${c.bg} ${c.border} ${
                    isSelected ? 'ring-2 ring-indigo-600 scale-[1.02] shadow-sm' : 'hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{bucket.bucket}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.badge}`}>
                      {bucket.percentage}%
                    </span>
                  </div>
                  <div className="text-xl font-extrabold mt-1 text-slate-900">
                    {bucket.totalPieces} <span className="text-xs font-normal text-slate-500">pcs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{bucket.description}</p>
                </div>
              );
            })}
          </div>

          {/* Outlet-Wise Aging Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Outlet-Wise Stock Aging Breakdown</h3>
              <p className="text-xs text-slate-500">Inventory pieces per outlet sorted into holding duration buckets</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">Outlet</th>
                    <th className="py-2.5 px-3 text-center">Total Stock</th>
                    <th className="py-2.5 px-3 text-center text-emerald-700">0-90D (Fresh)</th>
                    <th className="py-2.5 px-3 text-center text-blue-700">91-180D (Normal)</th>
                    <th className="py-2.5 px-3 text-center text-amber-700">181-365D (Slow)</th>
                    <th className="py-2.5 px-3 text-center text-orange-700">1-2 Yrs (Stagnant)</th>
                    <th className="py-2.5 px-3 text-center text-rose-700">&gt;2 Yrs (Dormant)</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {report.branchSummaries.filter(b => b.totalCurrentStock > 0).map((b) => {
                    const aging = b.agingBreakdown || { freshPcs: 0, agingPcs: 0, slowPcs: 0, oldPcs: 0, dormantPcs: 0 };
                    const hasDormant = (aging.oldPcs + aging.dormantPcs) > 0;

                    return (
                      <tr
                        key={b.branch}
                        onClick={() => onSelectBranch && onSelectBranch(b.branch)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {b.branch}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {b.totalCurrentStock}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">
                          {aging.freshPcs > 0 ? `${aging.freshPcs} pcs` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-600">
                          {aging.agingPcs > 0 ? `${aging.agingPcs} pcs` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-amber-600">
                          {aging.slowPcs > 0 ? `${aging.slowPcs} pcs` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-orange-600">
                          {aging.oldPcs > 0 ? `${aging.oldPcs} pcs` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-rose-600">
                          {aging.dormantPcs > 0 ? `${aging.dormantPcs} pcs` : '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {hasDormant ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                              Needs Rotation
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Healthy</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. PRODUCT VELOCITY TAB */}
      {activeSubTab === 'velocity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Item Velocity & Sales Run-Rate</h3>
                <p className="text-xs text-slate-500">Sales velocity performance across 3M, 6M, 1Y, and 2Y time horizons</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-4">{itemLabel}</th>
                    <th className="py-2.5 px-3 text-center">Current Stock</th>
                    <th className="py-2.5 px-3 text-center">Last 3 Months</th>
                    <th className="py-2.5 px-3 text-center">Last 6 Months</th>
                    <th className="py-2.5 px-3 text-center font-bold text-slate-900">Last 1 Year</th>
                    <th className="py-2.5 px-3 text-center">Last 2 Years</th>
                    <th className="py-2.5 px-3 text-center">Stock Health</th>
                    <th className="py-2.5 px-4 text-center">Velocity Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {report.weightSummaries.slice(0, 20).map((w) => {
                    const isDeficit = (w.sold1Y || w.soldQty) > w.currentStock;
                    const isExcess = w.currentStock > 0 && (w.sold1Y || w.soldQty) === 0;

                    return (
                      <tr
                        key={w.weight}
                        onClick={() => onSelectWeight && onSelectWeight(w.weight)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-900">{w.weight} ct</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">{w.currentStock} pcs</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{w.sold3M || 0} pcs</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{w.sold6M || 0} pcs</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{w.sold1Y || w.soldQty} pcs</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{w.sold2Y || 0} pcs</td>
                        <td className="py-2.5 px-3 text-center">
                          {isDeficit && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px]">
                              Stockout Risk
                            </span>
                          )}
                          {isExcess && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[10px]">
                              Excess Idle
                            </span>
                          )}
                          {!isDeficit && !isExcess && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            w.velocityCategory === 'Best-Seller'
                              ? 'bg-amber-100 text-amber-800'
                              : w.velocityCategory === 'Zero-Sales Stock'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {w.velocityCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
