import React, { useState, useEffect } from 'react';
import { RedistributionReport, TransferOrder } from '../types';
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Search,
  Sparkles,
  Layers,
  Store
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface MovementSummaryViewProps {
  report: RedistributionReport;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
}

export const MovementSummaryView: React.FC<MovementSummaryViewProps> = ({
  report,
  onSelectBranch,
  onSelectWeight
}) => {
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [searchBranch, setSearchBranch] = useState('');
  const [selectedWeight, setSelectedWeight] = useState<string>('ALL');

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  // Reset weight filter when new data arrives so movement orders always reflect latest import
  useEffect(() => {
    setSelectedWeight('ALL');
    setFilterPriority('ALL');
    setSearchBranch('');
  }, [report.period, report.transferOrders.length]);

  const filteredOrders = report.transferOrders.filter(t => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (selectedWeight !== 'ALL' && t.weight !== selectedWeight) return false;
    if (searchBranch) {
      const q = searchBranch.toLowerCase();
      return t.fromBranch.toLowerCase().includes(q) || t.toBranch.toLowerCase().includes(q);
    }
    return true;
  });

  const uniqueWeights = Array.from(new Set(report.transferOrders.map(t => t.weight))).sort((a, b) => {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  const handleExportMovementOnly = () => {
    const rows: any[] = [
      ['Transfer Order ID', itemLabel, 'Donor Branch (Move OUT)', 'Receiver Branch (Move IN)', `Quantity (${itemUnit})`, 'Priority', 'Strategic Reason', 'Status']
    ];
    filteredOrders.forEach(t => {
      rows.push([t.id, itemUnit === 'ct' ? `${t.weight} ct` : t.weight, t.fromBranch, t.toBranch, `${t.qty} ${itemUnit}`, t.priority, t.reason, t.status]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Movement_Summary');
    XLSX.writeFile(wb, `Stock_Movement_Transfer_Summary_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header Cards: Total Movements In/Out */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Move OUT</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
            {report.totalMoveOut} <span className="text-xs font-normal text-slate-500">units to transfer</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Surplus stock idle in slow-moving branches freed up
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Move IN</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-mono">
            {report.totalMoveIn} <span className="text-xs font-normal text-slate-500">units to receive</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Restocks high-velocity branches with 0 stock directly
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Transfer Routes</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-blue-600 font-mono">
            {report.transferOrders.length} <span className="text-xs font-normal text-slate-500">pairings</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Intra-branch redistribution without buying new inventory
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search donor or receiver branch..."
              value={searchBranch}
              onChange={(e) => setSearchBranch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedWeight}
            onChange={(e) => setSelectedWeight(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
          >
            <option value="ALL">All {itemLabel}s</option>
            {uniqueWeights.map(w => (
              <option key={w} value={w}>{itemUnit === 'ct' ? `${w} ct` : w}</option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterPriority('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                filterPriority === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              All ({report.transferOrders.length})
            </button>
            <button
              onClick={() => setFilterPriority('CRITICAL')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                filterPriority === 'CRITICAL' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilterPriority('HIGH')}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                filterPriority === 'HIGH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              High
            </button>
          </div>
        </div>

        <button
          onClick={handleExportMovementOnly}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Export Movement Sheet (.XLSX)
        </button>
      </div>

      {/* Movement Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900 dark:text-white">
              Stock Movement Dispatch Manifest
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
              {filteredOrders.length} transfers scheduled
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Movement Logic: Zero-sales branch transfers to Zero-stock high-demand branch
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No movement transfers found matching the filter criteria.
            </div>
          ) : (
            filteredOrders.map(t => (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                {/* Movement Route Details */}
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => onSelectWeight?.(t.weight)}
                    title={`Click to view enterprise store availability for ${t.weight} ct`}
                    className="w-12 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-col items-center justify-center font-mono font-bold text-xs shadow-sm px-1 text-center cursor-pointer hover:scale-105 hover:shadow-md transition-all"
                  >
                    <span className="truncate max-w-full">{t.weight}</span>
                    <span className="text-[9px] font-normal opacity-80">{itemUnit}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400">{t.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        t.priority === 'CRITICAL'
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-400/30'
                          : 'bg-blue-500/15 text-blue-600 border border-blue-400/30'
                      }`}>
                        {t.priority}
                      </span>
                    </div>

                    {/* Route: Move OUT -> Move IN */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex-wrap">
                      <button
                        onClick={() => onSelectBranch?.(t.fromBranch)}
                        title={`Click to open Branch ${t.fromBranch} report`}
                        className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2 py-0.5 rounded transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Move OUT: {t.fromBranch}</span>
                      </button>

                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />

                      <button
                        onClick={() => onSelectBranch?.(t.toBranch)}
                        title={`Click to open Branch ${t.toBranch} report`}
                        className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2 py-0.5 rounded transition-colors"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Move IN: {t.toBranch}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transfer Qty and Rationale */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-left md:text-right max-w-sm">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Transfer <span className="text-emerald-600 font-mono font-bold text-sm">{t.qty} {itemUnit}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {t.reason}
                    </p>
                  </div>

                  <span className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                    Ready to Dispatch
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
