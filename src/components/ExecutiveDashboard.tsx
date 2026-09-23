import React, { useState, useMemo, useEffect } from 'react';
import { RedistributionReport, SalesTimeframe } from '../types';
import {
  Gem,
  ArrowRightLeft,
  Search,
  Building2,
  Calendar,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  PackagePlus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ArrowRight,
  UploadCloud,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  Trophy,
  TrendingDown,
  LayoutGrid
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

interface ExecutiveDashboardProps {
  report: RedistributionReport;
  onSelectBranch: (branch: string) => void;
  onSelectWeight: (weight: string) => void;
  onNavigateTab?: (tab: string) => void;
  selectedTimeframe?: SalesTimeframe;
  onTimeframeChange?: (timeframe: SalesTimeframe) => void;
  onOpenDailyUpload?: () => void;
  onBackToHome?: () => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  report,
  onSelectBranch,
  onSelectWeight,
  onNavigateTab,
  selectedTimeframe = '1Y',
  onTimeframeChange,
  onOpenDailyUpload,
  onBackToHome
}) => {
  // Outlet Search State
  const [outletSearch, setOutletSearch] = useState('');
  const [outletFilter, setOutletFilter] = useState<'ALL' | 'SHORTAGE' | 'OVERSTOCKED'>('ALL');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Suggestions for quick auto-complete
  const outletSuggestions = useMemo(() => {
    if (!outletSearch.trim()) return [];
    const q = outletSearch.toLowerCase().trim();
    return report.branchSummaries.filter(b => b.branch.toLowerCase().includes(q)).slice(0, 8);
  }, [report.branchSummaries, outletSearch]);

  // Auto-expand outlets table when user searches so they immediately see the filtered results
  useEffect(() => {
    if (outletSearch.trim()) {
      setOpenGroups(prev => ({ ...prev, outlets: true }));
    }
  }, [outletSearch]);

  // Collapsible Groups State (Clean start face by grouping details)
  const [openGroups, setOpenGroups] = useState<{
    sufficiency: boolean;
    outlets: boolean;
    branchPerformance: boolean;
    productVelocity: boolean;
    transfers: boolean;
    consignmentAging: boolean;
  }>({
    sufficiency: false,
    outlets: false,
    branchPerformance: false,
    productVelocity: false,
    transfers: false,
    consignmentAging: false
  });

  const toggleGroup = (key: keyof typeof openGroups) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAllExpanded = useMemo(() => {
    return Object.values(openGroups).every(v => v);
  }, [openGroups]);

  const toggleAllGroups = () => {
    const nextState = !isAllExpanded;
    setOpenGroups({
      sufficiency: nextState,
      outlets: nextState,
      branchPerformance: nextState,
      productVelocity: nextState,
      transfers: nextState,
      consignmentAging: nextState
    });
  };

  const [activeBranchTab, setActiveBranchTab] = useState<'TOP_PERFORMING' | 'OVERSTOCKED'>('TOP_PERFORMING');
  const [activeProductTab, setActiveProductTab] = useState<'BEST_SELLERS' | 'STAGNANT'>('BEST_SELLERS');

  const itemUnit = report.categoryConfig?.itemUnit || 'pcs';
  const itemLabel = report.categoryConfig?.itemLabel || 'Item / SKU / Variant';

  // Filtered outlets based on search
  const filteredBranches = useMemo(() => {
    return report.branchSummaries.filter((b) => {
      const matchesSearch = b.branch.toLowerCase().includes(outletSearch.toLowerCase().trim());
      const matchesFilter =
        outletFilter === 'ALL' ||
        (outletFilter === 'SHORTAGE' && (b.status === 'SHORTAGE' || b.totalMoveIn > 0)) ||
        (outletFilter === 'OVERSTOCKED' && (b.status === 'OVERSTOCKED' || b.totalMoveOut > 0));
      return matchesSearch && matchesFilter;
    });
  }, [report.branchSummaries, outletSearch, outletFilter]);

  // Aging items > 180 days
  const agingSlowPieces = (report.agingBuckets || [])
    .filter((b) => b.bucket === '181-365 Days' || b.bucket === '1-2 Years' || b.bucket === '>2 Years')
    .reduce((sum, b) => sum + b.totalPieces, 0);

  // Chart 1 Data: Top 7 Outlets Stock vs Sales Demand
  const branchBarData = useMemo(() => {
    return [...report.branchSummaries]
      .sort((a, b) => b.totalSold - a.totalSold || b.totalCurrentStock - a.totalCurrentStock)
      .slice(0, 7)
      .map(b => ({
        name: b.branch,
        'Current Stock': b.totalCurrentStock,
        'Sold Qty': b.totalSold,
        'Move Out': b.totalMoveOut || 0,
        'Move In': b.totalMoveIn || 0,
      }));
  }, [report.branchSummaries]);

  // Chart 2 Data: Network Stock Status Breakdown
  const stockStatusPieData = useMemo(() => {
    const counts = { Shortage: 0, Balanced: 0, Overstocked: 0, Warehouse: 0 };
    report.branchSummaries.forEach(b => {
      if (b.status === 'SHORTAGE' || b.totalMoveIn > 0) counts.Shortage += 1;
      else if (b.status === 'OVERSTOCKED' || b.totalMoveOut > 0) counts.Overstocked += 1;
      else if (b.status === 'WAREHOUSE') counts.Warehouse += 1;
      else counts.Balanced += 1;
    });
    return [
      { name: 'Shortage (Need Stock)', value: counts.Shortage, color: '#ef4444' }, // red-500
      { name: 'Balanced', value: counts.Balanced, color: '#10b981' }, // emerald-500
      { name: 'Overstocked (Excess)', value: counts.Overstocked, color: '#f59e0b' }, // amber-500
      { name: 'Warehouse / Central', value: counts.Warehouse, color: '#6366f1' }, // indigo-500
    ].filter(item => item.value > 0);
  }, [report.branchSummaries]);

  // Chart 3 Data: Universal Item Run-Rate vs Stock
  const itemVelocityData = useMemo(() => {
    return [...report.weightSummaries]
      .sort((a, b) => ((b.sold1Y || b.soldQty) - (a.sold1Y || a.soldQty)) || (b.currentStock - a.currentStock))
      .slice(0, 6)
      .map(w => ({
        item: report.categoryConfig?.itemUnit === 'ct' ? `${w.weight} ct` : w.weight,
        'Stock': w.currentStock,
        'Sold': w.sold1Y || w.soldQty,
      }));
  }, [report.weightSummaries]);

  // Chart 4 Data: Stock Aging Buckets
  const agingChartData = useMemo(() => {
    return (report.agingBuckets || []).map(b => ({
      bucket: b.bucket.replace(' Days', 'D').replace(' Years', 'Y').replace(' Year', 'Y'),
      pieces: b.totalPieces,
    }));
  }, [report.agingBuckets]);

  // Top 5 and Lowest 5 Outlets (Top Selling vs Lowest Selling)
  const top5Outlets = useMemo(() => {
    if (report.top5SellingBranches && report.top5SellingBranches.length > 0) {
      return report.top5SellingBranches;
    }
    return [...report.branchSummaries.filter(b => !b.isWarehouse)]
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);
  }, [report.top5SellingBranches, report.branchSummaries]);

  const lowest5Outlets = useMemo(() => {
    if (report.lowest5SellingBranches && report.lowest5SellingBranches.length > 0) {
      return report.lowest5SellingBranches;
    }
    return [...report.branchSummaries.filter(b => !b.isWarehouse)]
      .sort((a, b) => a.totalSold - b.totalSold || b.totalCurrentStock - a.totalCurrentStock)
      .slice(0, 5);
  }, [report.lowest5SellingBranches, report.branchSummaries]);

  // Top 5 and Lowest 5 Items / Variants
  const top5Weights = useMemo(() => {
    if (report.top5BestSellingWeights && report.top5BestSellingWeights.length > 0) {
      return report.top5BestSellingWeights;
    }
    return [...report.weightSummaries]
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);
  }, [report.top5BestSellingWeights, report.weightSummaries]);

  const lowest5Weights = useMemo(() => {
    if (report.lowest5SellingWeights && report.lowest5SellingWeights.length > 0) {
      return report.lowest5SellingWeights;
    }
    return [...report.weightSummaries]
      .sort((a, b) => a.soldQty - b.soldQty || b.currentStock - a.currentStock)
      .slice(0, 5);
  }, [report.lowest5SellingWeights, report.weightSummaries]);

  return (
    <div className="space-y-5" id="necessary-dashboard-root">
      
      {/* 1. DWL ANALYTICAL ENTERPRISE COCKPIT TOOLBAR (ERP Style) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer mr-1 shadow-xs"
                title="Return to ERP Modules Directory"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-teal-500" />
                <span>ERP Menu</span>
              </button>
            )}
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              DWL Analytical Cockpit
            </h1>
            <span className="hidden sm:inline text-[11px] font-bold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-teal-300 border border-slate-200 dark:border-slate-700 font-mono">
              Enterprise
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            <span>{report.branchSummaries.length} Retail Outlets Monitored</span>
            <span>•</span>
            <span>Universal Item Allocation Rule</span>
            <span>•</span>
            <span className="text-teal-600 dark:text-teal-400 font-medium">Multi-Branch Balancing</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* Outlet Quick Search with Auto-Complete Suggestion Dropdown */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={outletSearch}
              onFocus={() => setShowSearchDropdown(true)}
              onChange={(e) => {
                setOutletSearch(e.target.value);
                setShowSearchDropdown(true);
              }}
              placeholder="Search outlet (e.g. GUL, DMD)..."
              className="pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 w-48 sm:w-56"
            />
            {outletSearch && (
              <button
                onClick={() => {
                  setOutletSearch('');
                  setShowSearchDropdown(false);
                }}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold cursor-pointer"
                title="Clear search"
              >
                ×
              </button>
            )}

            {/* Dropdown Suggestions Menu */}
            {showSearchDropdown && outletSearch.trim() && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSearchDropdown(false)}
                />
                <div className="absolute left-0 right-0 sm:right-auto sm:w-80 mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-72 overflow-y-auto text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>MATCHING OUTLETS ({outletSuggestions.length})</span>
                    <span className="text-[9px] text-teal-600 dark:text-teal-400">Click to view details</span>
                  </div>
                  {outletSuggestions.length > 0 ? (
                    outletSuggestions.map((b) => {
                      const isShortage = b.status === 'SHORTAGE' || b.totalMoveIn > 0;
                      const isOverstocked = b.status === 'OVERSTOCKED' || b.totalMoveOut > 0;
                      return (
                        <div
                          key={b.branch}
                          onClick={() => {
                            setOutletSearch(b.branch);
                            setShowSearchDropdown(false);
                            onSelectBranch(b.branch);
                          }}
                          className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/90 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{b.branch}</span>
                              {b.isWarehouse && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  WH
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Stock: <strong className="text-slate-700 dark:text-slate-200">{b.totalCurrentStock}</strong></span>
                              <span>•</span>
                              <span>Sold: <strong className="text-teal-600 dark:text-teal-400">{b.totalSold}</strong></span>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {isShortage ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                Need +{b.totalMoveIn}
                              </span>
                            ) : isOverstocked ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                Excess -{b.totalMoveOut}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-900">
                                Balanced
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-center text-slate-400 text-xs">
                      No outlet found matching &ldquo;{outletSearch}&rdquo;
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Multi-Period Sales Velocity Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Horizon:
            </span>
            {(['3M', '6M', '1Y', '2Y'] as SalesTimeframe[]).map((tf) => {
              const isSelected = selectedTimeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title={`Calculate sales run-rate over ${tf}`}
                >
                  {tf}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Search & Filter Banner */}
      {outletSearch.trim() && (
        <div className="bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 p-2.5 rounded-lg flex items-center justify-between text-xs gap-3 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300 truncate">
              Filtering outlets matching: <strong className="text-slate-900 dark:text-white">&ldquo;{outletSearch}&rdquo;</strong> ({filteredBranches.length} found)
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filteredBranches.length > 0 && (
              <button
                onClick={() => onSelectBranch(filteredBranches[0].branch)}
                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white rounded font-medium text-[11px] transition-all cursor-pointer"
              >
                Inspect {filteredBranches[0].branch}
              </button>
            )}
            <button
              onClick={() => {
                setOutletSearch('');
                setShowSearchDropdown(false);
              }}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs underline cursor-pointer"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* 2. VITAL KPI CARDS (IMPORTANT METRICS AT TOP) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Network Stock</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {report.totalCurrentStock} <span className="text-xs font-semibold text-slate-400">pcs</span>
          </div>
          <span className="text-[11px] text-slate-500 block truncate">
            Across {report.branchSummaries.length} retail outlets
          </span>
        </div>

        {/* Total Sold in Period */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sold ({selectedTimeframe})</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {report.totalSold} <span className="text-xs font-semibold text-slate-400">pcs</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium block truncate">
            Customer sales demand
          </span>
        </div>

        {/* Move Out (Excess) */}
        <div
          onClick={() => toggleGroup('transfers')}
          className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-sm space-y-1 cursor-pointer hover:border-amber-300 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
            <span>Move Out (Excess)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700">
            {report.totalMoveOut} <span className="text-xs font-semibold text-amber-600/70">pcs</span>
          </div>
          <span className="text-[11px] text-amber-800 font-medium block truncate">
            Idle stock to withdraw
          </span>
        </div>

        {/* Move In (Shortage) */}
        <div
          onClick={() => toggleGroup('transfers')}
          className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200/80 shadow-sm space-y-1 cursor-pointer hover:border-indigo-300 transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
            <span>Move In (Shortage)</span>
            <ArrowDownLeft className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700">
            {report.totalMoveIn} <span className="text-xs font-semibold text-indigo-600/70">pcs</span>
          </div>
          <span className="text-[11px] text-indigo-800 font-medium block truncate">
            Stockout deficit to fulfill
          </span>
        </div>
      </div>

      {/* 3. VISUAL CHARTS SECTION ("JUST CHART GULA RAKHTE PARE") */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Chart A: Top Outlets Stock vs Sales Demand (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Outlet Stock vs Sales Demand
              </h3>
              <p className="text-xs text-slate-500">
                Compares current on-shelf inventory against customer sales demand
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">Top 7 Outlets</span>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Current Stock" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Sold Qty" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Move Out" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Outlet Stock Status Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Network Stock Balance
              </h3>
              <p className="text-xs text-slate-500">
                Health distribution across all {report.branchSummaries.length} outlets
              </p>
            </div>
          </div>

          <div className="h-52 sm:h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockStatusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stockStatusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Clean Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {stockStatusPieData.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Chart Row: Item Demand & Aging Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart C: Universal Item Run-Rate vs Available Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-indigo-500" />
                Item Velocity: Stock vs Sales Run-Rate
              </h4>
              <p className="text-[11px] text-slate-500">Fastest selling items vs available pieces</p>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={itemVelocityData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="item" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Bar dataKey="Stock" fill="#3b82f6" radius={[3, 3, 0, 0]} barSize={12} />
                <Bar dataKey="Sold" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Inventory Aging Duration Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                Inventory Aging Profile (Days in Stock)
              </h4>
              <p className="text-[11px] text-slate-500">Age distribution of inventory held across outlets</p>
            </div>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {agingSlowPieces} pcs &gt; 180D
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="pieces" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 3.5. COMPACT LEADERBOARDS: TOP & LOWEST 5 (OUTLETS & CARATS) */}
      <div className="bg-slate-900/95 text-slate-100 rounded-xl p-3 sm:p-3.5 shadow-sm border border-slate-800 space-y-2.5">
        {/* Compact Bar Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/90">
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <h3 className="text-xs font-bold text-white tracking-tight">
              Performance Rankings (Top &amp; Lowest 5)
            </h3>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              • High velocity vs dormant stock
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {selectedTimeframe} Horizon
          </span>
        </div>

        {/* 4 Compact Columns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
          
          {/* CARD 1: TOP 5 SELLING OUTLETS */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  Top 5 Selling Outlets
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-950/80 text-teal-300 border border-teal-800/60">
                  Best
                </span>
              </div>

              <div className="space-y-1">
                {top5Outlets.map((b, idx) => (
                  <div
                    key={b.branch}
                    onClick={() => onSelectBranch(b.branch)}
                    className="py-1 px-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 transition-all cursor-pointer flex items-center justify-between gap-1.5 group text-[11px]"
                    title={`Click to view ${b.branch} transfers`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-teal-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate group-hover:text-teal-300">
                        {b.branch}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Stk: {b.totalCurrentStock}</span>
                      <span className="font-black text-teal-300">{b.totalSold}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>Top Total Sold:</span>
              <strong className="text-teal-300 font-bold">
                {top5Outlets.reduce((s, b) => s + b.totalSold, 0)} {itemUnit}
              </strong>
            </div>
          </div>

          {/* CARD 2: LOWEST 5 SELLING OUTLETS */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Lowest 5 Selling Outlets
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  Slow
                </span>
              </div>

              <div className="space-y-1">
                {lowest5Outlets.map((b, idx) => (
                  <div
                    key={b.branch}
                    onClick={() => onSelectBranch(b.branch)}
                    className="py-1 px-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 transition-all cursor-pointer flex items-center justify-between gap-1.5 group text-[11px]"
                    title={`Click to view ${b.branch} transfers`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-rose-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate group-hover:text-rose-300">
                        {b.branch}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Stk: {b.totalCurrentStock}</span>
                      <span className="font-black text-rose-300">{b.totalSold}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>Idle Stock:</span>
              <strong className="text-amber-300 font-bold">
                {lowest5Outlets.reduce((s, b) => s + b.totalCurrentStock, 0)} {itemUnit}
              </strong>
            </div>
          </div>

          {/* CARD 3: TOP 5 BEST-SELLING CARATS */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Top 5 Best-Selling Items
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                  Popular
                </span>
              </div>

              <div className="space-y-1">
                {top5Weights.map((w, idx) => (
                  <div
                    key={w.weight}
                    onClick={() => onSelectWeight(w.weight)}
                    className="py-1 px-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 transition-all cursor-pointer flex items-center justify-between gap-1.5 group text-[11px]"
                    title={`Click to filter by ${w.weight}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-indigo-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate group-hover:text-indigo-300">
                        {w.weight} {itemLabel}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Stk: {w.currentStock}</span>
                      <span className="font-black text-indigo-300">{w.soldQty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>Top Items Sold:</span>
              <strong className="text-indigo-300 font-bold">
                {top5Weights.reduce((s, w) => s + w.soldQty, 0)} pcs
              </strong>
            </div>
          </div>

          {/* CARD 4: LOWEST 5 SELLING CARATS */}
          <div className="bg-slate-950/70 rounded-lg border border-slate-800 p-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800/80">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Lowest 5 Selling Items
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  Dormant
                </span>
              </div>

              <div className="space-y-1">
                {lowest5Weights.map((w, idx) => (
                  <div
                    key={w.weight}
                    onClick={() => onSelectWeight(w.weight)}
                    className="py-1 px-2 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 transition-all cursor-pointer flex items-center justify-between gap-1.5 group text-[11px]"
                    title={`Click to filter by ${w.weight}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-amber-300 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-200 truncate group-hover:text-amber-300">
                        {w.weight} {itemLabel}
                      </span>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className="text-slate-400 text-[10px]">Stk: {w.currentStock}</span>
                      <span className="font-black text-slate-300">{w.soldQty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>Locked Up Stock:</span>
              <strong className="text-amber-300 font-bold">
                {lowest5Weights.reduce((s, w) => s + w.currentStock, 0)} pcs
              </strong>
            </div>
          </div>

        </div>
      </div>

      {/* 4. GROUPED OPERATIONS & DETAIL SECTIONS ("BAKI SHOB GROUP KORE VITORE DHUKAN") */}
      <div className="pt-2 space-y-3">
        {/* Group Section Header & Expand/Collapse All Button */}
        <div className="flex items-center justify-between bg-slate-100/90 px-4 py-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              Detailed Operations &amp; Categorized Groups
            </h3>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Click any group to expand/collapse details)
            </span>
          </div>

          <button
            onClick={toggleAllGroups}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all shadow-2xs"
          >
            {isAllExpanded ? 'Collapse All Groups' : 'Expand All Groups'}
          </button>
        </div>

        {/* GROUP 1: STOCK SUFFICIENCY & NETWORK BALANCING AUDIT */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => toggleGroup('sufficiency')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Stock Sufficiency Audit: Is Current Stock Enough?
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Sufficient (~18.5M Supply)
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Evaluates total network volume against customer sales and quantifies internal misallocation.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {openGroups.sufficiency ? 'Hide' : 'Show'}
              </span>
              {openGroups.sufficiency ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openGroups.sufficiency && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">Total Network Inventory</span>
                  <div className="text-2xl font-black text-slate-900">
                    {report.totalCurrentStock} <span className="text-xs font-normal text-slate-500">pcs</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Combined stock across all 25 retail branches and central vaults.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">Identified Imbalance</span>
                  <div className="text-2xl font-black text-amber-600">
                    {report.totalMoveOut} <span className="text-xs font-normal text-amber-700">pcs misallocated</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    19 pieces are trapped in low-turnover branches while active branches face stockouts.
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block">Recommended Action</span>
                  <div className="text-sm font-bold text-indigo-700 pt-1">
                    Internal Rebalancing (Zero Capital Cost)
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Transferring 19 pcs from overstocked to shortage branches restores maximum sales without new purchases.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GROUP 2: ALL 25 RETAIL OUTLETS DIRECTORY & SEARCH TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => toggleGroup('outlets')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Outlet Stock Directory &amp; Instant Search
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {report.branchSummaries.length} Outlets
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Search any outlet to inspect total stock, sales demand, and move recommendations.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {openGroups.outlets ? 'Hide Table' : 'Show Table'}
              </span>
              {openGroups.outlets ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openGroups.outlets && (
            <div className="border-t border-slate-100">
              <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Instant Search Bar */}
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    list="outlet-names-list"
                    value={outletSearch}
                    onChange={(e) => setOutletSearch(e.target.value)}
                    placeholder="Search outlet (e.g. GUL, DMD)..."
                    className="pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-600 w-48 sm:w-60"
                  />
                  {outletSearch && (
                    <button
                      onClick={() => setOutletSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                      title="Clear"
                    >
                      ×
                    </button>
                  )}
                  <datalist id="outlet-names-list">
                    {report.branchSummaries.map(b => (
                      <option key={b.branch} value={b.branch} />
                    ))}
                  </datalist>
                </div>

                {/* Status Filter */}
                <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs">
                  <button
                    onClick={() => setOutletFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      outletFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    All ({report.branchSummaries.length})
                  </button>
                  <button
                    onClick={() => setOutletFilter('SHORTAGE')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      outletFilter === 'SHORTAGE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Shortage
                  </button>
                  <button
                    onClick={() => setOutletFilter('OVERSTOCKED')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      outletFilter === 'OVERSTOCKED' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    Overstocked
                  </button>
                </div>
              </div>

              {/* Outlet Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-4">Outlet Name</th>
                      <th className="py-2 px-3 text-center">Total Stock</th>
                      <th className="py-2 px-3 text-center">{selectedTimeframe} Sales</th>
                      <th className="py-2 px-3 text-center text-amber-700">Move Out</th>
                      <th className="py-2 px-3 text-center text-emerald-700">Move In</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredBranches.map((b) => (
                      <tr
                        key={b.branch}
                        onClick={() => onSelectBranch(b.branch)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-2 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {b.branch}
                        </td>
                        <td className="py-2 px-3 text-center font-extrabold text-slate-900">
                          {b.totalCurrentStock} pcs
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-600">
                          {b.totalSold} pcs
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-amber-700">
                          {b.totalMoveOut > 0 ? `-${b.totalMoveOut}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700">
                          {b.totalMoveIn > 0 ? `+${b.totalMoveIn}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === 'SHORTAGE'
                              ? 'bg-rose-100 text-rose-800'
                              : b.status === 'OVERSTOCKED'
                              ? 'bg-amber-100 text-amber-800'
                              : b.status === 'WAREHOUSE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800">
                            Drilldown →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* GROUP 3: BRANCH SALES PERFORMANCE & OVERSTOCKED OUTLETS */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => toggleGroup('branchPerformance')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Branch Performance &amp; Overstock Breakdown
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                    Withdrawal Targets Available
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Top performing outlets by sales share vs outlets holding excess idle stock to withdraw.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {openGroups.branchPerformance ? 'Hide' : 'Show'}
              </span>
              {openGroups.branchPerformance ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openGroups.branchPerformance && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 pt-3">
                <button
                  onClick={() => setActiveBranchTab('TOP_PERFORMING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeBranchTab === 'TOP_PERFORMING'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Top Selling Outlets (Sales Share %)
                </button>
                <button
                  onClick={() => setActiveBranchTab('OVERSTOCKED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeBranchTab === 'OVERSTOCKED'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Overstocked Outlets (Where to Withdraw)
                </button>
              </div>

              {activeBranchTab === 'TOP_PERFORMING' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {report.branchSummaries
                    .filter(b => b.totalSold > 0)
                    .sort((a, b) => b.totalSold - a.totalSold)
                    .slice(0, 6)
                    .map((b) => {
                      const salesSharePct = report.totalSold > 0 ? Math.round((b.totalSold / report.totalSold) * 100) : 0;
                      return (
                        <div
                          key={b.branch}
                          onClick={() => onSelectBranch(b.branch)}
                          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{b.branch}</span>
                            <span className="text-xs font-extrabold text-emerald-600">{salesSharePct}% Share</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {b.totalCurrentStock} pcs stock · {b.totalSold} sold
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {report.branchSummaries
                    .filter(b => b.totalMoveOut > 0 || (b.totalCurrentStock > 4 && b.totalSold === 0))
                    .sort((a, b) => (b.totalMoveOut || b.totalCurrentStock) - (a.totalMoveOut || a.totalCurrentStock))
                    .slice(0, 6)
                    .map((b) => (
                      <div
                        key={b.branch}
                        onClick={() => onSelectBranch(b.branch)}
                        className="p-3 bg-amber-50/60 hover:bg-amber-100/60 rounded-xl border border-amber-100 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{b.branch}</span>
                          <span className="text-xs font-bold text-amber-700">Withdraw {b.totalMoveOut || 1} pcs</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {b.totalCurrentStock} on shelves · {b.totalSold} sold
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* GROUP 4: PRODUCT VELOCITY: BEST SELLERS VS ZERO-SALES STAGNANT STOCK */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => toggleGroup('productVelocity')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Item Velocity: High Demand vs Stagnant Items
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                    Velocity Analysis
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Fastest moving customer bestsellers vs zero-turnover dormant items.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {openGroups.productVelocity ? 'Hide' : 'Show'}
              </span>
              {openGroups.productVelocity ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openGroups.productVelocity && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-2 pt-3">
                <button
                  onClick={() => setActiveProductTab('BEST_SELLERS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeProductTab === 'BEST_SELLERS'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Best Sellers (High Demand)
                </button>
                <button
                  onClick={() => setActiveProductTab('STAGNANT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeProductTab === 'STAGNANT'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Zero-Sales / Dormant Items
                </button>
              </div>

              {activeProductTab === 'BEST_SELLERS' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {report.weightSummaries
                    .filter(w => (w.sold1Y || w.soldQty) > 0)
                    .sort((a, b) => (b.sold1Y || b.soldQty) - (a.sold1Y || a.soldQty))
                    .slice(0, 6)
                    .map((w) => {
                      const sold = w.sold1Y || w.soldQty;
                      return (
                        <div
                          key={w.weight}
                          onClick={() => onSelectWeight(w.weight)}
                          className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 cursor-pointer transition-colors space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{w.weight} ct Solitaire</span>
                            <span className="text-xs font-bold text-emerald-600">{sold} Sold</span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Current Stock: {w.currentStock} pcs
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {report.weightSummaries
                    .filter(w => (w.sold1Y || w.soldQty) === 0 && w.currentStock > 0)
                    .sort((a, b) => b.currentStock - a.currentStock)
                    .slice(0, 6)
                    .map((w) => (
                      <div
                        key={w.weight}
                        onClick={() => onSelectWeight(w.weight)}
                        className="p-3 bg-rose-50/50 hover:bg-rose-100/50 rounded-xl border border-rose-100 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-xs">{w.weight} ct Solitaire</span>
                          <span className="text-xs font-bold text-rose-700">0 Sold</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {w.currentStock} pcs idle on shelves
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* GROUP 5: READY-TO-EXECUTE TRANSFER ORDERS */}
        {report.transferOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
            <button
              onClick={() => toggleGroup('transfers')}
              className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    Actionable Inter-Branch Transfer Orders
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">
                      {report.transferOrders.length} Transfers Ready
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Direct routing slips to withdraw excess from donor outlets and send to shortage outlets.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                  {openGroups.transfers ? 'Hide' : 'Show'}
                </span>
                {openGroups.transfers ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openGroups.transfers && (
              <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs font-bold text-slate-700">Generated Transfer Slips:</span>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('redistribution')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Open Full Movement Center <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {report.transferOrders.slice(0, 4).map((to) => (
                    <div
                      key={to.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 text-xs">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">
                            {to.fromBranch}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                            {to.toBranch}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold text-xs rounded">
                          {to.qty} pcs ({to.weight} ct)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        {to.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GROUP 6: CONSIGNMENT REQUISITION & AGING DEEP-DIVE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
          <button
            onClick={() => toggleGroup('consignmentAging')}
            className="w-full p-4 sm:p-4.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <PackagePlus className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Consignment Procurement &amp; Aging Health
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                    Shipment Planner
                  </span>
                </h4>
                <p className="text-xs text-slate-500">
                  Quick links to consignment procurement planner and historical aging breakdowns.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                {openGroups.consignmentAging ? 'Hide' : 'Show'}
              </span>
              {openGroups.consignmentAging ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {openGroups.consignmentAging && (
            <div className="p-4 sm:p-5 pt-0 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div
                  onClick={() => onNavigateTab && onNavigateTab('consignment_shipment')}
                  className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <PackagePlus className="w-4 h-4 text-emerald-600" />
                      Consignment Requisition Planner
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-700" />
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    {report.consignmentRecommendations?.length || 0} high-demand items are depleted in company stock.
                  </p>
                </div>

                <div
                  onClick={() => onNavigateTab && onNavigateTab('movement_aging')}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Movement &amp; Aging Analysis
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Day-over-day movement audit, sales velocity, and detailed aging buckets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
