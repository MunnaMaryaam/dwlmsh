import React, { useState } from 'react';
import { RedistributionReport, BranchSummary } from '../types';
import {
  X,
  Building2,
  Gem,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  TrendingUp,
  Package,
  Boxes,
  Truck,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface BranchDetailModalProps {
  branchName: string | null;
  onClose: () => void;
  report: RedistributionReport;
  onSelectProduct: (weight: string) => void;
  onSelectAnotherBranch: (branch: string) => void;
}

export const BranchDetailModal: React.FC<BranchDetailModalProps> = ({
  branchName,
  onClose,
  report,
  onSelectProduct,
  onSelectAnotherBranch
}) => {
  const [productFilter, setProductFilter] = useState<'ALL' | 'MOVE_IN' | 'MOVE_OUT' | 'IN_STOCK' | 'SOLD'>('ALL');

  if (!branchName) return null;

  const branchSummary = report.branchSummaries.find((b) => b.branch === branchName);

  // Incoming transfer orders for this branch
  const incomingTransfers = report.transferOrders.filter((t) => t.toBranch === branchName);
  // Outgoing transfer orders from this branch
  const outgoingTransfers = report.transferOrders.filter((t) => t.fromBranch === branchName);

  // Product breakdown for this branch
  const branchProducts = report.matrix.weights.map((w) => {
    const cell = report.matrix.cells[branchName]?.[w] || {
      sold: 0,
      stock: 0,
      moveIn: 0,
      moveOut: 0,
      netMove: 0
    };
    const globalWeight = report.weightSummaries.find((ws) => ws.weight === w);

    let actionStatus: 'MOVE_IN' | 'MOVE_OUT' | 'BALANCED' | 'INACTIVE' = 'INACTIVE';
    if (cell.moveIn > 0) actionStatus = 'MOVE_IN';
    else if (cell.moveOut > 0) actionStatus = 'MOVE_OUT';
    else if (cell.stock > 0 || cell.sold > 0) actionStatus = 'BALANCED';

    return {
      weight: w,
      sold: cell.sold,
      stock: cell.stock,
      moveIn: cell.moveIn,
      moveOut: cell.moveOut,
      netMove: cell.netMove,
      actionStatus,
      globalSold: globalWeight?.soldQty || 0,
      globalStock: globalWeight?.currentStock || 0
    };
  }).filter((p) => {
    if (productFilter === 'MOVE_IN') return p.moveIn > 0;
    if (productFilter === 'MOVE_OUT') return p.moveOut > 0;
    if (productFilter === 'IN_STOCK') return p.stock > 0;
    if (productFilter === 'SOLD') return p.sold > 0;
    // For 'ALL', show items with either sold, stock, moveIn or moveOut
    return p.sold > 0 || p.stock > 0 || p.moveIn > 0 || p.moveOut > 0;
  });

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  const handleExportBranchExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Branch Summary Sheet
    const summaryRows: any[][] = [
      ['Branch Name', branchName],
      ['Audit Period', report.period],
      ['Total Sold', branchSummary?.totalSold || 0],
      ['Current Physical Stock', branchSummary?.totalCurrentStock || 0],
      ['Total Move IN (Inbound Transfer)', branchSummary?.totalMoveIn || 0],
      ['Total Move OUT (Outbound Transfer)', branchSummary?.totalMoveOut || 0],
      ['Net Adjustment', branchSummary?.netChange || 0],
      ['Status', branchSummary?.status || 'BALANCED']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Branch_Overview');

    // 2. Product Items Sheet
    const itemRows: any[][] = [
      [itemLabel, `Sold (${itemUnit})`, `Current Stock (${itemUnit})`, `Move IN (+)`, `Move OUT (-)`, 'Net Movement', 'Directive']
    ];
    branchProducts.forEach((p) => {
      itemRows.push([
        itemUnit === 'ct' ? `${p.weight} ct` : p.weight,
        p.sold,
        p.stock,
        p.moveIn,
        p.moveOut,
        p.netMove,
        p.moveIn > 0 ? `Inbound +${p.moveIn}` : p.moveOut > 0 ? `Outbound -${p.moveOut}` : 'Balanced'
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemRows), 'Product_Distribution');

    // 3. Dispatch Challans
    const dispatchRows: any[][] = [
      ['Direction', 'Order ID', itemLabel, 'Partner Branch', `Quantity (${itemUnit})`, 'Priority', 'Reason']
    ];
    incomingTransfers.forEach((t) => {
      dispatchRows.push(['INBOUND (Receiving)', t.id, t.weight, `From ${t.fromBranch}`, t.qty, t.priority, t.reason]);
    });
    outgoingTransfers.forEach((t) => {
      dispatchRows.push(['OUTBOUND (Sending)', t.id, t.weight, `To ${t.toBranch}`, t.qty, t.priority, t.reason]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dispatchRows), 'Transfer_Challans');

    XLSX.writeFile(wb, `Branch_${branchName}_Stock_Report.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 font-mono font-black text-lg">
              {branchName.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  Branch {branchName} - Complete Stock &amp; Movement Report
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  branchSummary?.status === 'SHORTAGE'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : branchSummary?.status === 'OVERSTOCKED'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {branchSummary?.status || 'ACTIVE BRANCH'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit Period: <strong className="text-slate-200">{report.period}</strong> • Retail Store Inventory &amp; Transfer Reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportBranchExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold transition-colors"
              title="Download branch transfer report as Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Branch Excel</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Quick Branch Switcher Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap">Switch Branch:</span>
            {report.branchSummaries.map((b) => (
              <button
                key={b.branch}
                onClick={() => onSelectAnotherBranch(b.branch)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs whitespace-nowrap transition-colors border ${
                  b.branch === branchName
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {b.branch}
              </button>
            ))}
          </div>

          {/* 4 CORE KPI METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Sold */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Customer Sold
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {branchSummary?.totalSold || 0}
                </span>
                <span className="text-[11px] text-slate-400">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Sales velocity in this branch
              </span>
            </div>

            {/* Current Stock */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Stock
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-white">
                  {branchSummary?.totalCurrentStock || 0}
                </span>
                <span className="text-[11px] text-slate-400">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Physical units on hand
              </span>
            </div>

            {/* Move IN Required */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Inbound Move IN</span>
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  +{branchSummary?.totalMoveIn || 0}
                </span>
                <span className="text-[11px] text-emerald-400/80">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-1">
                To receive from donor stores
              </span>
            </div>

            {/* Move OUT Required */}
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Outbound Move OUT</span>
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-rose-300">
                  -{branchSummary?.totalMoveOut || 0}
                </span>
                <span className="text-[11px] text-rose-400/80">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-rose-400/80 mt-1">
                Excess idle stock to transfer out
              </span>
            </div>

          </div>

          {/* TRANSFER LOGISTICS SECTION: INBOUND & OUTBOUND */}
          {(incomingTransfers.length > 0 || outgoingTransfers.length > 0) && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Active Transfer Orders for Branch {branchName}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Inbound Orders */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Incoming Shipments ({incomingTransfers.length})</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Receiving {incomingTransfers.reduce((a, b) => a + b.qty, 0)} {itemUnit}
                    </span>
                  </div>

                  {incomingTransfers.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No incoming transfers scheduled for this branch.</p>
                  ) : (
                    incomingTransfers.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white font-mono">{t.weight} ct</span>
                            <span className="text-slate-400">from</span>
                            <span className="font-bold text-cyan-300">Branch {t.fromBranch}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t.reason}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                            +{t.qty} {itemUnit}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Outbound Orders */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Outgoing Dispatches ({outgoingTransfers.length})</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Sending {outgoingTransfers.reduce((a, b) => a + b.qty, 0)} {itemUnit}
                    </span>
                  </div>

                  {outgoingTransfers.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No outgoing dispatches required from this branch.</p>
                  ) : (
                    outgoingTransfers.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white font-mono">{t.weight} ct</span>
                            <span className="text-slate-400">to</span>
                            <span className="font-bold text-amber-300">Branch {t.toBranch}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{t.reason}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-rose-950 text-rose-300 border border-rose-800">
                            -{t.qty} {itemUnit}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>
          )}

          {/* PRODUCT INVENTORY BREAKDOWN TABLE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span>Product Variant Inventory in Branch {branchName}</span>
              </h3>

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  onClick={() => setProductFilter('ALL')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    productFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  All ({branchProducts.length})
                </button>
                <button
                  onClick={() => setProductFilter('MOVE_IN')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    productFilter === 'MOVE_IN' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-300 bg-slate-800'
                  }`}
                >
                  Needs Inbound Stock (+IN)
                </button>
                <button
                  onClick={() => setProductFilter('MOVE_OUT')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    productFilter === 'MOVE_OUT' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-rose-300 bg-slate-800'
                  }`}
                >
                  Excess to Dispatch (-OUT)
                </button>
                <button
                  onClick={() => setProductFilter('IN_STOCK')}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    productFilter === 'IN_STOCK' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  In Stock Only
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 sticky top-0 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">{itemLabel}</th>
                      <th className="py-2.5 px-3 text-center">Customer Sold</th>
                      <th className="py-2.5 px-3 text-center">Current Stock</th>
                      <th className="py-2.5 px-3 text-center">Move IN</th>
                      <th className="py-2.5 px-3 text-center">Move OUT</th>
                      <th className="py-2.5 px-3 text-center">Net Adjustment</th>
                      <th className="py-2.5 px-3 text-right">Action Directive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {branchProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          No product records match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      branchProducts.map((p) => (
                        <tr
                          key={p.weight}
                          onClick={() => {
                            onClose();
                            onSelectProduct(p.weight);
                          }}
                          className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                          title={`Click to see where ${p.weight} ct is located across all branches`}
                        >
                          <td className="py-2.5 px-3 text-white font-bold flex items-center gap-2">
                            <Gem className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{p.weight} {itemUnit === 'ct' ? 'ct' : ''}</span>
                          </td>

                          <td className="py-2.5 px-3 text-center text-slate-200">
                            {p.sold}
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold text-white">
                            {p.stock}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {p.moveIn > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                                +{p.moveIn}
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {p.moveOut > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                -{p.moveOut}
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold">
                            {p.netMove > 0 ? (
                              <span className="text-emerald-400">+{p.netMove}</span>
                            ) : p.netMove < 0 ? (
                              <span className="text-rose-400">{p.netMove}</span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {p.moveIn > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                                Inbound Stock Needed
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            ) : p.moveOut > 0 ? (
                              <span className="text-[10px] font-bold text-rose-400 flex items-center justify-end gap-1">
                                Donate Surplus Out
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            ) : p.stock > 0 ? (
                              <span className="text-[10px] text-slate-400">
                                Stock Balanced
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">
                                Zero Activity
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Click any product row to view company-wide store locations and stock presence</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Close Report
          </button>
        </div>

      </div>
    </div>
  );
};
