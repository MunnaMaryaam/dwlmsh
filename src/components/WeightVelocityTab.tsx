import React, { useState } from 'react';
import { RedistributionReport, WeightSummary } from '../types';
import { Gem, ArrowUpDown, TrendingUp, Flame, Clock, ShoppingBag } from 'lucide-react';

interface WeightVelocityTabProps {
  report: RedistributionReport;
  onSelectWeight: (weight: string) => void;
}

export const WeightVelocityTab: React.FC<WeightVelocityTabProps> = ({
  report,
  onSelectWeight
}) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'BEST_SELLER' | 'SLOW_MOVING' | 'REPURCHASE'>('ALL');
  const [sortField, setSortField] = useState<keyof WeightSummary>('soldQty');
  const [sortAsc, setSortAsc] = useState(false);

  // Filter weights that have at least some company presence
  const activeWeights = report.weightSummaries.filter((w) => {
    if (filterCategory === 'BEST_SELLER') return w.soldQty >= 2;
    if (filterCategory === 'SLOW_MOVING') return w.currentStock > 0 && w.soldQty === 0;
    if (filterCategory === 'REPURCHASE') return w.unmetShortage > 0;
    return w.soldQty > 0 || w.currentStock > 0;
  }).sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const handleSort = (field: keyof WeightSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';
  const categoryName = report.categoryConfig?.name || 'Product Variant';

  return (
    <div className="space-y-6">
      
      {/* Top 5 Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Top 5 Best-Selling */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-blue-900/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-cyan-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 5 Best-Selling {itemLabel}s
                </h3>
                <p className="text-[11px] text-slate-500">Highest sales conversion across retail network</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
              {report.top5BestSellingWeights.reduce((acc, w) => acc + w.soldQty, 0)} Total Sold
            </span>
          </div>

          <div className="space-y-2.5">
            {report.top5BestSellingWeights.map((w, idx) => (
              <div
                key={w.weight}
                onClick={() => onSelectWeight(w.weight)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-855 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-bold flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {w.weight} {itemUnit === 'ct' ? 'Carat' : ''}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {categoryName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 block">
                      {w.soldQty} Sold
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {w.currentStock} in stock
                    </span>
                  </div>
                  {w.unmetShortage > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                      Need {w.unmetShortage}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Slow-Moving */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 5 Slow-Moving {itemLabel}s
                </h3>
                <p className="text-[11px] text-slate-500">Highest inventory holding with zero recent sales</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
              {report.top5SlowMovingWeights.reduce((acc, w) => acc + w.currentStock, 0)} Idle Stock
            </span>
          </div>

          <div className="space-y-2.5">
            {report.top5SlowMovingWeights.map((w, idx) => (
              <div
                key={w.weight}
                onClick={() => onSelectWeight(w.weight)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-855 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-bold flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {w.weight} {itemUnit === 'ct' ? 'Carat' : ''}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {categoryName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 block">
                      {w.currentStock} Idle Stock
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      0 Sold in period
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold">
                    Reallocate
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Full Weights Analysis Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gem className="w-4 h-4 text-cyan-500" />
              {itemLabel} Movement Matrix & Stock Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Detailed velocity, turnover ratio, and restocking requirements for every product item.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-850 p-1 rounded-lg text-xs">
            <button
              onClick={() => setFilterCategory('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterCategory === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Active
            </button>
            <button
              onClick={() => setFilterCategory('BEST_SELLER')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterCategory === 'BEST_SELLER'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Best-Sellers
            </button>
            <button
              onClick={() => setFilterCategory('SLOW_MOVING')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterCategory === 'SLOW_MOVING'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Slow-Moving
            </button>
            <button
              onClick={() => setFilterCategory('REPURCHASE')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                filterCategory === 'REPURCHASE'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              New Purchase Needed
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                <th
                  onClick={() => handleSort('weightNum')}
                  className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center gap-1">
                    {itemLabel} Identifier <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('soldQty')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center justify-center gap-1">
                    Total Sold ({itemUnit}) <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('currentStock')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center justify-center gap-1">
                    Current Stock ({itemUnit}) <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('moveInNeeded')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center justify-center gap-1 text-emerald-600">
                    Move IN Needed <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('moveOutNeeded')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center justify-center gap-1 text-rose-600">
                    Move OUT Needed <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('unmetShortage')}
                  className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <span className="flex items-center justify-center gap-1 text-amber-600">
                    New Buy Needed <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right">
                  Velocity Category
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeWeights.map((w) => (
                <tr
                  key={w.weight}
                  onClick={() => onSelectWeight(w.weight)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                    {itemUnit === 'ct' ? `${w.weight} ct` : w.weight}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600 dark:text-cyan-400">
                    {w.soldQty}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                    {w.currentStock}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-emerald-600 font-bold">
                    {w.moveInNeeded > 0 ? `+${w.moveInNeeded}` : '0'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-rose-600 font-bold">
                    {w.moveOutNeeded > 0 ? `-${w.moveOutNeeded}` : '0'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold">
                    {w.unmetShortage > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                        Buy {w.unmetShortage}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {w.velocityCategory === 'Best-Seller' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-400/30">
                        Best-Seller
                      </span>
                    )}
                    {w.velocityCategory === 'Steady' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Steady
                      </span>
                    )}
                    {w.velocityCategory === 'Slow-Moving' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/30">
                        Slow-Moving
                      </span>
                    )}
                    {w.velocityCategory === 'Zero-Sales Stock' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                        Idle Capital
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
