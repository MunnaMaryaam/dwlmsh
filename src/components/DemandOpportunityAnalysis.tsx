import React, { useState } from 'react';
import { RedistributionReport } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  Store,
  ArrowRight,
  Download,
  Flame,
  Clock,
  Sparkles,
  BarChart2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface DemandOpportunityAnalysisProps {
  report: RedistributionReport;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
}

export const DemandOpportunityAnalysis: React.FC<DemandOpportunityAnalysisProps> = ({
  report,
  onSelectBranch,
  onSelectWeight
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'out_of_stock' | 'branch_demand' | 'sales_boost'>('out_of_stock');

  // Find all items with High Demand but Zero Company/Branch Stock
  const zeroStockHighDemandWeights = report.weightSummaries.filter(
    w => w.soldQty > 0 && w.currentStock === 0
  ).sort((a, b) => b.soldQty - a.soldQty);

  // Partial Stock items where Sold > Stock (unmet shortage)
  const unmetShortageWeights = report.weightSummaries.filter(
    w => w.unmetShortage > 0
  ).sort((a, b) => b.unmetShortage - a.unmetShortage);

  // Branch level unmet demand
  const branchShortages = report.branchSummaries.filter(
    b => b.totalSold > 0 && b.totalCurrentStock === 0
  ).sort((a, b) => b.totalSold - a.totalSold);

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Particular';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';
  const estimatedUnitPrice = report.categoryConfig?.estimatedAvgUnitPrice || 250;

  // Estimate lost sales potential
  const estimatedLostUnits = report.totalNewStockToBuy;
  const estimatedOpportunityValue = estimatedLostUnits * estimatedUnitPrice;

  const handleExportDemandReport = () => {
    const rows: any[] = [
      [itemLabel, `Sold Demand (Customer Orders)`, `Current Inventory (${itemUnit})`, `Unmet Shortage (${itemUnit})`, 'Turnover Velocity', 'Recommended Action']
    ];
    unmetShortageWeights.forEach(w => {
      rows.push([
        itemUnit === 'ct' ? `${w.weight} ct` : w.weight,
        w.soldQty,
        w.currentStock,
        w.unmetShortage,
        w.velocityCategory,
        `Immediate purchase of ${w.unmetShortage} ${itemUnit} to satisfy verified customer demand`
      ]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Unmet_Demand_Opportunities');
    XLSX.writeFile(wb, `Lost_Sales_Demand_Opportunity_Report_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* High-level Revenue Opportunity Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-blue-500/10 border border-amber-300/40 dark:border-amber-700/30 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500 text-white">
                <Flame className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Unmet Demand & Lost Sales Potential
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                Direct Sales Booster
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              These products have proven high sales demand from customers, but our inventory is depleted (0 stock). Bringing them back in stock will immediately increase total retail revenue.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Unmet Demand Units</div>
              <div className="text-xl font-extrabold text-amber-600 font-mono">
                {report.totalNewStockToBuy} <span className="text-xs font-normal text-slate-400">{itemUnit}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Potential Revenue Lift</div>
              <div className="text-xl font-extrabold text-emerald-600 font-mono">
                ~${estimatedOpportunityValue.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Export */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('out_of_stock')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'out_of_stock'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Top Out-of-Stock {itemLabel}s ({unmetShortageWeights.length})
          </button>

          <button
            onClick={() => setActiveSubTab('branch_demand')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'branch_demand'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Branches with Zero Stock Shortage ({branchShortages.length})
          </button>
        </div>

        <button
          onClick={handleExportDemandReport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Export Demand Analysis (.XLSX)
        </button>
      </div>

      {/* Grid of Key Unmet Items */}
      {activeSubTab === 'out_of_stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unmetShortageWeights.map((w, index) => (
              <div
                key={w.weight}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                      Rank #{index + 1} Missing Demand
                    </span>
                    <span className="text-[10px] font-semibold text-rose-500 uppercase">
                      Lost Sales Risk
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white font-mono">
                        {w.weight} <span className="text-xs font-normal text-slate-500">{itemUnit === 'ct' ? 'ct' : ''}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {w.velocityCategory}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-400">Shortage Deficit</div>
                      <div className="text-xl font-extrabold text-amber-600 font-mono">
                        +{w.unmetShortage} {itemUnit}
                      </div>
                    </div>
                  </div>

                  {/* Visual Bar Comparison */}
                  <div className="mt-3 space-y-1.5 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Customer Sold Demand:</span>
                      <span className="font-bold text-blue-600 font-mono">{w.soldQty} {itemUnit} sold</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }}></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">Current Stock Remaining:</span>
                      <span className={`font-bold font-mono ${w.currentStock === 0 ? 'text-rose-600 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
                        {w.currentStock} {itemUnit} in stock
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (w.currentStock / Math.max(1, w.soldQty)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    Restock urgency: High
                  </span>
                  <span className="font-semibold text-amber-600 flex items-center gap-1">
                    Buy {w.unmetShortage} {itemUnit} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Full Demand Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Detailed Product Demand Matrix (Stock = 0 or Below Demand)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3">{itemLabel} Particulars</th>
                    <th className="py-2.5 px-3 text-center">Sold Velocity</th>
                    <th className="py-2.5 px-3 text-center">Available Stock</th>
                    <th className="py-2.5 px-3 text-center text-amber-600">Unmet Sales Gap</th>
                    <th className="py-2.5 px-3">Revenue Impact & Recommendation</th>
                    <th className="py-2.5 px-3 text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unmetShortageWeights.map(w => (
                    <tr key={w.weight} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {itemUnit === 'ct' ? `${w.weight} ct` : w.weight}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600">
                        {w.soldQty} sold
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-600">
                        {w.currentStock} in stock
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                        +{w.unmetShortage} {itemUnit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        Customer demand exists across multiple branches. Procuring {w.unmetShortage} {itemUnit} directly boosts revenue.
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {w.soldQty >= 3 ? 'CRITICAL BUY' : 'HIGH BUY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Branch Shortage View */}
      {activeSubTab === 'branch_demand' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              Branches with High Sales Velocity but ZERO Current Inventory
            </span>
            <span className="text-[11px] text-slate-500">
              Customers are actively visiting these stores but stock is empty
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {branchShortages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No branches currently have zero stock with active sales.
              </div>
            ) : (
              branchShortages.map(b => (
                <div key={b.branch} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{b.branch}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-600">
                        Zero Stock Alert
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Total items sold: <strong className="text-slate-900 dark:text-white font-mono">{b.totalSold} {itemUnit}</strong> | Move IN Required: <strong className="text-emerald-600 font-mono">+{b.totalMoveIn} {itemUnit}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Shortage Gap</div>
                      <div className="text-lg font-mono font-bold text-rose-600">
                        {b.totalMoveIn} units needed
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
