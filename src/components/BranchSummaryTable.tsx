import React, { useState } from 'react';
import { RedistributionReport, BranchSummary } from '../types';
import { Building2, Search, ArrowUpDown, CheckCircle, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface BranchSummaryTableProps {
  report: RedistributionReport;
  onSelectBranch: (branch: string) => void;
}

export const BranchSummaryTable: React.FC<BranchSummaryTableProps> = ({
  report,
  onSelectBranch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof BranchSummary>('totalSold');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: keyof BranchSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredBranches = report.branchSummaries.filter((b) =>
    b.branch.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const itemLabel = report.categoryConfig?.itemLabel || 'Item';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  return (
    <div className="space-y-4">
      
      {/* Header & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Branch Distribution & Inventory Summary
          </h2>
          <p className="text-xs text-slate-500">
            Complete inventory distribution audit across all {report.branchSummaries.length} retail branches and central distribution hubs.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search branch name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold text-[11px] tracking-wider border-b border-slate-700">
                <th
                  onClick={() => handleSort('branch')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-1">
                    Branch Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('totalSold')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">
                    Total Sold ({itemUnit}) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('totalCurrentStock')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">
                    Current Stock ({itemUnit}) <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('totalMoveIn')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1 text-emerald-300">
                    Total Move IN ({itemUnit}) <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('totalMoveOut')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1 text-rose-300">
                    Total Move OUT ({itemUnit}) <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('netChange')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">
                    Net Change <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('variantsNeedingAction')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <span className="flex items-center justify-center gap-1">
                    {itemLabel} Variants Needing Action <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="py-3 px-3 text-right">
                  Status & Allocation
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBranches.map((b) => {
                const isOverstocked = b.totalCurrentStock > 0 && b.totalSold === 0;
                const isShortage = b.totalSold > 0 && b.totalCurrentStock === 0;

                return (
                  <tr
                    key={b.branch}
                    onClick={() => onSelectBranch(b.branch)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      {b.branch}
                      {b.isWarehouse && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          Warehouse
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {b.totalSold}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {b.totalCurrentStock}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {b.isWarehouse ? (
                        <span className="text-slate-400 text-[10px]">N/A (Warehouse)</span>
                      ) : b.totalMoveIn > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                          +{b.totalMoveIn}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {b.isWarehouse ? (
                        <span className="text-slate-400 text-[10px]">N/A (Warehouse)</span>
                      ) : b.totalMoveOut > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                          -{b.totalMoveOut}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {b.isWarehouse ? (
                        <span className="text-slate-400 text-[10px]">N/A</span>
                      ) : b.netChange > 0 ? (
                        <span className="text-emerald-600 font-bold">+{b.netChange}</span>
                      ) : b.netChange < 0 ? (
                        <span className="text-rose-600 font-bold">{b.netChange}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300">
                      {b.isWarehouse ? 'N/A' : b.variantsNeedingAction}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      {b.isWarehouse ? (
                        <span className="text-[10px] text-slate-500 font-medium">Central Buffer</span>
                      ) : isShortage ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Shortage Deficit
                        </span>
                      ) : isOverstocked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          Overstocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">
                          Balanced
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Grand Total Row matching Image 4 */}
            <tfoot className="bg-sky-50 dark:bg-slate-850 font-bold border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3 px-3 text-slate-900 dark:text-white font-extrabold">
                  Grand Total
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-blue-600 dark:text-cyan-400 text-sm">
                  {report.totalSold}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                  {report.totalCurrentStock}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-emerald-600 text-sm">
                  {report.totalMoveIn}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-rose-600 text-sm">
                  {report.totalMoveOut}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                  {report.netStockPosition}
                </td>
                <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                  {report.branchSummaries.reduce((sum, b) => sum + b.variantsNeedingAction, 0)}
                </td>
                <td className="py-3 px-3 text-right text-xs font-mono text-slate-500">
                  Across {report.branchSummaries.length} Branches
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
