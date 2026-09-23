import React, { useState } from 'react';
import { RedistributionReport, WeightSummary } from '../types';
import {
  X,
  Gem,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Download,
  Flame,
  Store,
  Boxes,
  HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductLocationModalProps {
  productWeight: string | null;
  onClose: () => void;
  report: RedistributionReport;
  onSelectBranch: (branch: string) => void;
  onSelectAnotherProduct: (weight: string) => void;
}

export const ProductLocationModal: React.FC<ProductLocationModalProps> = ({
  productWeight,
  onClose,
  report,
  onSelectBranch,
  onSelectAnotherProduct
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'HAS_STOCK' | 'HAS_SHORTAGE' | 'HAS_SURPLUS'>('HAS_STOCK');

  if (!productWeight) return null;

  const weightSummary = report.weightSummaries.find((w) => w.weight === productWeight);
  const procurementOrder = report.procurementOrders.find((p) => p.weight === productWeight);

  // Find all branches and their status for this product
  const branchLocations = report.matrix.branches.map((b) => {
    const cell = report.matrix.cells[b]?.[productWeight] || {
      sold: 0,
      stock: 0,
      moveIn: 0,
      moveOut: 0,
      netMove: 0
    };

    let locationStatus: 'IN_STOCK' | 'SHORTAGE' | 'OVERSTOCKED' | 'BALANCED' | 'INACTIVE' = 'INACTIVE';
    if (cell.stock > 0 && cell.sold === 0) {
      locationStatus = 'OVERSTOCKED';
    } else if (cell.stock > 0) {
      locationStatus = 'IN_STOCK';
    } else if (cell.sold > 0 && cell.stock === 0) {
      locationStatus = 'SHORTAGE';
    } else if (cell.moveIn > 0) {
      locationStatus = 'SHORTAGE';
    } else if (cell.moveOut > 0) {
      locationStatus = 'OVERSTOCKED';
    }

    return {
      branch: b,
      stock: cell.stock,
      sold: cell.sold,
      moveIn: cell.moveIn,
      moveOut: cell.moveOut,
      netMove: cell.netMove,
      locationStatus
    };
  });

  // Calculate location stats
  const branchesWithStock = branchLocations.filter((l) => l.stock > 0);
  const branchesWithShortage = branchLocations.filter((l) => l.sold > 0 && l.stock === 0);
  const branchesWithSurplus = branchLocations.filter((l) => l.moveOut > 0 || (l.stock > 0 && l.sold === 0));

  // Filter based on active tab
  const displayedBranches = branchLocations.filter((l) => {
    if (filterMode === 'HAS_STOCK') return l.stock > 0;
    if (filterMode === 'HAS_SHORTAGE') return l.sold > 0 || l.moveIn > 0;
    if (filterMode === 'HAS_SURPLUS') return l.moveOut > 0 || (l.stock > 0 && l.sold === 0);
    // 'ALL' shows branches with any stock, sold, or transfer activity
    return l.stock > 0 || l.sold > 0 || l.moveIn > 0 || l.moveOut > 0;
  });

  // Active transfer orders for this product
  const productTransfers = report.transferOrders.filter((t) => t.weight === productWeight);

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / SKU / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';
  const isCarat = itemUnit === 'ct';

  const handleExportProductExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Overview Sheet
    const overviewRows: any[][] = [
      ['Product / Particular', `${productWeight} ${isCarat ? 'ct' : ''}`],
      ['Audit Period', report.period],
      ['Total Sold Across Branches', weightSummary?.soldQty || 0],
      ['Total Available Stock', weightSummary?.currentStock || 0],
      ['Branches with Physical Stock', `${branchesWithStock.length} branches`],
      ['Refill Purchase Needed', weightSummary?.unmetShortage || 0],
      ['Sales Velocity Category', weightSummary?.velocityCategory || 'Steady']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overviewRows), 'Product_Overview');

    // 2. Branch Locations Sheet
    const locationRows: any[][] = [
      ['Branch Name', `Current Stock (${itemUnit})`, `Customer Sold (${itemUnit})`, 'Move IN (+)', 'Move OUT (-)', 'Status', 'Action Directive']
    ];
    branchLocations.forEach((l) => {
      locationRows.push([
        l.branch,
        l.stock,
        l.sold,
        l.moveIn,
        l.moveOut,
        l.stock > 0 ? 'Stock Available' : l.sold > 0 ? 'Deficit Shortage' : 'No Stock',
        l.moveIn > 0 ? `Receiving +${l.moveIn}` : l.moveOut > 0 ? `Sending -${l.moveOut}` : l.stock > 0 ? 'Ready for sale' : 'Inactive'
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(locationRows), 'Branch_Locations');

    // 3. Movement Transfers Sheet
    const transferRows: any[][] = [
      ['Transfer ID', 'From (Donor Store)', 'To (Receiver Store)', `Quantity (${itemUnit})`, 'Priority', 'Reason']
    ];
    productTransfers.forEach((t) => {
      transferRows.push([t.id, t.fromBranch, t.toBranch, t.qty, t.priority, t.reason]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(transferRows), 'Active_Transfers');

    XLSX.writeFile(wb, `Product_${productWeight}ct_Locations_Report.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Gem className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2">
                  {productWeight} {isCarat ? 'Carat Diamond' : itemLabel} - Location &amp; Stock Tracker
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  {weightSummary?.velocityCategory || 'Standard SKU'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Audit Period: <strong className="text-slate-200">{report.period}</strong> • Product Distribution across all retail stores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleExportProductExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold transition-colors"
              title="Download product location sheet as Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Locations</span>
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
          
          {/* Quick Product Switcher Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap">Switch Size:</span>
            {report.weightSummaries.map((w) => (
              <button
                key={w.weight}
                onClick={() => onSelectAnotherProduct(w.weight)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs whitespace-nowrap transition-colors border ${
                  w.weight === productWeight
                    ? 'bg-blue-600 text-white font-bold border-blue-400 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {w.weight} {isCarat ? 'ct' : ''}
              </button>
            ))}
          </div>

          {/* 4 CORE KPI METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Sold */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Sold (Company)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {weightSummary?.soldQty || 0}
                </span>
                <span className="text-[11px] text-slate-400">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Total customer sales demand
              </span>
            </div>

            {/* Total Company Stock */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Stock (Company)
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-white">
                  {weightSummary?.currentStock || 0}
                </span>
                <span className="text-[11px] text-slate-400">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Units in all branches combined
              </span>
            </div>

            {/* Stores with Available Physical Stock */}
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Store className="w-3.5 h-3.5" />
                <span>Stores with Stock</span>
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {branchesWithStock.length}
                </span>
                <span className="text-[11px] text-emerald-400/80">of {report.matrix.branches.length} branches</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 mt-1">
                Physical inventory available
              </span>
            </div>

            {/* Procurement Refill Needed */}
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-900/60 flex flex-col justify-between">
              <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Refill Buy Needed</span>
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black font-mono text-amber-300">
                  {weightSummary?.unmetShortage || 0}
                </span>
                <span className="text-[11px] text-amber-400/80">{itemUnit}</span>
              </div>
              <span className="text-[10px] text-amber-400/80 mt-1">
                {weightSummary?.unmetShortage ? 'Demand exceeds stock' : 'Sufficient company stock'}
              </span>
            </div>

          </div>

          {/* REFILL RATIONALE BANNER IF PROCUREMENT REQUIRED */}
          {procurementOrder && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/90 text-amber-200 uppercase">
                    Procurement Required
                  </span>
                  <span className="text-xs font-bold text-white">
                    Need to order {procurementOrder.qtyToBuy} new {productWeight} ct {itemLabel}
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  <strong>Replenishment Justification:</strong> {procurementOrder.rationale}
                </p>
              </div>

              <div className="shrink-0 font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-900/60 text-amber-200 border border-amber-700">
                Priority: {procurementOrder.urgency}
              </div>
            </div>
          )}

          {/* ACTIVE MOVEMENT TRANSFERS FOR THIS PRODUCT */}
          {productTransfers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>Scheduled Inter-Branch Movements for {productWeight} ct</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {productTransfers.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-500">{t.id}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                        Qty: {t.qty} {itemUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1">
                      <button
                        onClick={() => {
                          onClose();
                          onSelectBranch(t.fromBranch);
                        }}
                        className="font-bold text-rose-300 hover:underline flex items-center gap-1"
                        title="View donor branch report"
                      >
                        <Building2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Branch {t.fromBranch}</span>
                      </button>

                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />

                      <button
                        onClick={() => {
                          onClose();
                          onSelectBranch(t.toBranch);
                        }}
                        className="font-bold text-emerald-300 hover:underline flex items-center gap-1"
                        title="View recipient branch report"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Branch {t.toBranch}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      {t.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ENTERPRISE STORE LOCATION AND AVAILABILITY TABLE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Store Inventory Presence &amp; Multi-Branch Availability</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Detailed branch-by-branch stock availability, customer demand, and rebalancing directives
                </p>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                <button
                  onClick={() => setFilterMode('HAS_STOCK')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    filterMode === 'HAS_STOCK' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-emerald-300 bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>In Stock Now ({branchesWithStock.length})</span>
                </button>

                <button
                  onClick={() => setFilterMode('HAS_SHORTAGE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    filterMode === 'HAS_SHORTAGE' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-amber-300 bg-slate-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Demand / Shortage ({branchesWithShortage.length})</span>
                </button>

                <button
                  onClick={() => setFilterMode('HAS_SURPLUS')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    filterMode === 'HAS_SURPLUS' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-blue-300 bg-slate-800'
                  }`}
                >
                  <span>Surplus / Donors ({branchesWithSurplus.length})</span>
                </button>

                <button
                  onClick={() => setFilterMode('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterMode === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  All Stores
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 sticky top-0 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Branch Name</th>
                      <th className="py-2.5 px-3 text-center">Physical Stock on Hand</th>
                      <th className="py-2.5 px-3 text-center">Customer Sold</th>
                      <th className="py-2.5 px-3 text-center">Move IN (+)</th>
                      <th className="py-2.5 px-3 text-center">Move OUT (-)</th>
                      <th className="py-2.5 px-3 text-center">Stock Status</th>
                      <th className="py-2.5 px-3 text-right">Redistribution Directive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {displayedBranches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          No branches match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedBranches.map((l) => (
                        <tr
                          key={l.branch}
                          onClick={() => {
                            onClose();
                            onSelectBranch(l.branch);
                          }}
                          className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                          title={`Click to open Branch ${l.branch} complete report`}
                        >
                          <td className="py-2.5 px-3 text-white font-bold flex items-center gap-2 font-sans">
                            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Branch {l.branch}</span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold">
                            {l.stock > 0 ? (
                              <span className="text-emerald-400 font-extrabold text-sm">
                                {l.stock} {itemUnit}
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center text-slate-300">
                            {l.sold}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {l.moveIn > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                                +{l.moveIn}
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {l.moveOut > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                -{l.moveOut}
                              </span>
                            ) : (
                              <span className="text-slate-600">0</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center font-sans">
                            {l.stock > 0 && l.sold === 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                Surplus Stock
                              </span>
                            ) : l.stock > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                In Stock (Available)
                              </span>
                            ) : l.sold > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                                Stockout Deficit
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">
                                Zero Activity
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-sans">
                            {l.moveIn > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                                Receive +{l.moveIn} from donor
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            ) : l.moveOut > 0 ? (
                              <span className="text-[10px] font-bold text-rose-400 flex items-center justify-end gap-1">
                                Donate -{l.moveOut} to network
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            ) : l.stock > 0 ? (
                              <span className="text-[10px] text-slate-300">
                                Ready for store sales
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">
                                No action needed
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
            <span>Click any branch row to view that branch's complete store report</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            Close Tracker
          </button>
        </div>

      </div>
    </div>
  );
};
