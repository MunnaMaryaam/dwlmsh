import React, { useState } from 'react';
import { RedistributionReport, TransferOrder, ProcurementOrder } from '../types';
import {
  ArrowRightLeft,
  CheckCircle2,
  Filter,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  Truck,
  Building,
  Gem,
  ShoppingBag
} from 'lucide-react';

interface AutomatedRedistributionTabProps {
  report: RedistributionReport;
  selectedBranchFilter: string;
  selectedWeightFilter: string;
  onBranchFilterChange: (b: string) => void;
  onWeightFilterChange: (w: string) => void;
}

export const AutomatedRedistributionTab: React.FC<AutomatedRedistributionTabProps> = ({
  report,
  selectedBranchFilter,
  selectedWeightFilter,
  onBranchFilterChange,
  onWeightFilterChange
}) => {
  const [moveDirectionFilter, setMoveDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [transferState, setTransferState] = useState<Record<string, 'RECOMMENDED' | 'APPROVED' | 'DISPATCHED'>>({});

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  // Active matrix branches & weights
  const matrixBranches = report.matrix.branches.filter((b) => b !== 'DWL');
  const matrixWeights = report.matrix.weights.filter((w) => {
    // Only show weights that have any stock or sales in the company
    const wSummary = report.weightSummaries.find((ws) => ws.weight === w);
    return wSummary && (wSummary.soldQty > 0 || wSummary.currentStock > 0);
  });

  const filteredTransfers = report.transferOrders.filter((t) => {
    if (selectedBranchFilter && t.fromBranch !== selectedBranchFilter && t.toBranch !== selectedBranchFilter) {
      return false;
    }
    if (selectedWeightFilter && t.weight !== selectedWeightFilter) {
      return false;
    }
    if (moveDirectionFilter === 'IN' && selectedBranchFilter && t.toBranch !== selectedBranchFilter) {
      return false;
    }
    if (moveDirectionFilter === 'OUT' && selectedBranchFilter && t.fromBranch !== selectedBranchFilter) {
      return false;
    }
    return true;
  });

  const handleUpdateStatus = (id: string, nextStatus: 'APPROVED' | 'DISPATCHED') => {
    setTransferState((prev) => ({ ...prev, [id]: nextStatus }));
  };

  const handlePrintTransferSlips = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Header & Control Slicers */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-500" />
              Automated Redistribution & Stock Transfer Logic
            </h2>
            <p className="text-xs text-slate-500">
              Balances inventory stock by matching overstocked donor branches (Move OUT) with stockout deficit branches (Move IN).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintTransferSlips}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Transfer Slips
            </button>
          </div>
        </div>

        {/* Slicers (from Image 1 in user uploads) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
          
          {/* Branch Slicer */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter Branch
            </label>
            <select
              value={selectedBranchFilter}
              onChange={(e) => onBranchFilterChange(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All Branches ({report.branchSummaries.length})</option>
              {report.branchSummaries.map((b) => (
                <option key={b.branch} value={b.branch}>
                  {b.branch} {b.totalMoveIn > 0 ? `(+${b.totalMoveIn})` : ''} {b.totalMoveOut > 0 ? `(-${b.totalMoveOut})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Weight Slicer */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Filter {itemLabel}
            </label>
            <select
              value={selectedWeightFilter}
              onChange={(e) => onWeightFilterChange(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All {itemLabel}s</option>
              {matrixWeights.map((w) => (
                <option key={w} value={w}>
                  {itemUnit === 'ct' ? `${w} ct` : w}
                </option>
              ))}
            </select>
          </div>

          {/* Move Direction Slicer */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Move Direction
            </label>
            <select
              value={moveDirectionFilter}
              onChange={(e) => setMoveDirectionFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-medium text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-cyan-500"
            >
              <option value="ALL">All Directions (IN & OUT)</option>
              <option value="IN">Move IN Only (Deficit Branches)</option>
              <option value="OUT">Move OUT Only (Overstocked Branches)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Generated Automated Transfer Slips Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold">
              Automated Inter-Branch Transfer Orders ({filteredTransfers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Direct stock rebalancing orders
          </span>
        </div>

        {filteredTransfers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No transfer orders match the current filter selection. Select a different branch or weight.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">{itemLabel}</th>
                  <th className="py-2.5 px-3">Move OUT (Donor)</th>
                  <th className="py-2.5 px-3">Move IN (Receiver)</th>
                  <th className="py-2.5 px-3 text-center">Qty ({itemUnit})</th>
                  <th className="py-2.5 px-3">Redistribution Rationale</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3 text-right">Action Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransfers.map((order) => {
                  const currentStatus = transferState[order.id] || order.status;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] font-bold text-slate-500">
                        {order.id}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 dark:text-white font-mono flex items-center gap-1">
                          <Gem className="w-3 h-3 text-cyan-400" />
                          {itemUnit === 'ct' ? `${order.weight} ct` : order.weight}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          {order.fromBranch}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {order.toBranch}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {order.qty} {itemUnit}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs">
                        {order.reason}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                          order.priority === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                        }`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {currentStatus === 'RECOMMENDED' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'APPROVED')}
                            className="px-2.5 py-1 text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors shadow-sm"
                          >
                            Approve Transfer
                          </button>
                        )}
                        {currentStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'DISPATCHED')}
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors shadow-sm"
                          >
                            Mark Dispatched
                          </button>
                        )}
                        {currentStatus === 'DISPATCHED' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dispatched
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Procurement Orders: New Stock Needed (Cannot be solved by intra-company transfers) */}
      {report.procurementOrders.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Company-wide New Stock Needed (Total: {report.totalNewStockToBuy} {itemUnit} to purchase)
              </h3>
            </div>
            <span className="text-[11px] text-amber-700 dark:text-amber-300 font-mono">
              {itemLabel}s with Total Sold &gt; Total Stock (Nothing left to redistribute)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.procurementOrders.map((p) => (
              <div
                key={p.weight}
                className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-lg p-3 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {itemUnit === 'ct' ? `${p.weight} ct` : p.weight}
                    </span>
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                      Buy {p.qtyToBuy} {itemUnit}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                    {p.rationale}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Demand: {p.soldDemand} sold</span>
                  <span className="text-slate-400">Avail: {p.availableStock} in stock</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move IN / Move OUT Matrix Table (Reproducing Image 3 from user's Excel) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Branch × {itemLabel} Redistribution Matrix
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-mono text-emerald-600">
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 font-bold border border-emerald-300">+1</span>
              = Move IN
            </span>
            <span className="flex items-center gap-1 font-mono text-rose-600">
              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 font-bold border border-rose-300">-1</span>
              = Move OUT
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-200 dark:bg-slate-855 z-10 border-b border-slate-300 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-200 dark:bg-slate-855 z-20 border-r border-slate-300 dark:border-slate-700 min-w-[120px]">
                  Particulars ({itemLabel})
                </th>
                {matrixBranches.map((b) => (
                  <th
                    key={b}
                    className="py-2.5 px-2 font-semibold text-slate-700 dark:text-slate-300 text-center min-w-[80px] border-r border-slate-300 dark:border-slate-700 text-[10px] whitespace-nowrap"
                  >
                    {b}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold text-amber-900 bg-amber-200 text-center min-w-[90px]">
                  Action Needed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {matrixWeights.map((w) => {
                let hasAction = false;

                return (
                  <tr key={w} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
                      {itemUnit === 'ct' ? `${w} ct` : w}
                    </td>

                    {matrixBranches.map((b) => {
                      const cell = report.matrix.cells[b]?.[w];
                      const netMove = cell ? cell.netMove : 0;

                      if (netMove !== 0) hasAction = true;

                      return (
                        <td
                          key={b}
                          className={`py-1.5 px-2 text-center font-mono font-bold text-xs border-r border-slate-100 dark:border-slate-800 ${
                            netMove > 0
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                              : netMove < 0
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {netMove > 0 ? `+${netMove}` : netMove < 0 ? `${netMove}` : '0'}
                        </td>
                      );
                    })}

                    <td className={`py-1.5 px-3 text-center font-bold text-xs ${hasAction ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300' : 'text-slate-400'}`}>
                      {hasAction ? 'Yes' : 'No'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
