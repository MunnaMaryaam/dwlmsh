import React from 'react';
import { TrendingUp, PackageCheck, ArrowDownLeft, ArrowUpRight, Scale, ShoppingBag } from 'lucide-react';
import { RedistributionReport } from '../types';

interface KpiMetricsRowProps {
  report: RedistributionReport;
}

export const KpiMetricsRow: React.FC<KpiMetricsRowProps> = ({ report }) => {
  const sellThroughRate = report.totalSold + report.totalCurrentStock > 0
    ? ((report.totalSold / (report.totalSold + report.totalCurrentStock)) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="w-full">
      {/* Primary KPI Header Banner matching the user's report style */}
      <div className="bg-gradient-to-r from-sky-200 via-sky-300 to-blue-200 dark:from-slate-800 dark:via-slate-850 dark:to-slate-800 rounded-xl p-3 shadow-md border border-sky-300/60 dark:border-slate-700">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          
          {/* 1. Total Sold */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-sky-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Total Sold (Period)
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {report.totalSold}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
              Sell-Through: {sellThroughRate}%
            </span>
          </div>

          {/* 2. Total Current Stock */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-sky-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-0.5">
              <PackageCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Total Current Stock
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {report.totalCurrentStock}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
              Across {report.branchSummaries.length} Branches
            </span>
          </div>

          {/* 3. Move IN Needed */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-sky-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-0.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Move IN Needed
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {report.totalMoveIn}
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-medium mt-0.5">
              Deficit Restocking
            </span>
          </div>

          {/* 4. Move OUT Needed */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-sky-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-0.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Move OUT Needed
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 font-mono">
              {report.totalMoveOut}
            </div>
            <span className="text-[10px] text-rose-700 dark:text-rose-300/80 font-medium mt-0.5">
              Overstock Reallocation
            </span>
          </div>

          {/* 5. Net Stock Position */}
          <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-sky-100 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 mb-0.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Net Stock Position
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {report.netStockPosition > 0 ? `+${report.netStockPosition}` : report.netStockPosition}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
              Intra-company Equilibrium
            </span>
          </div>

          {/* 6. New Stock to Buy */}
          <div className="bg-amber-50 dark:bg-amber-950/40 rounded-lg p-3 border border-amber-200 dark:border-amber-800 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 mb-0.5">
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                New Stock to Buy
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
              {report.totalNewStockToBuy}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium mt-0.5">
              Total {report.categoryConfig?.itemUnit || 'units'} to newly purchase
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
