import React, { useState, useMemo } from 'react';
import { RedistributionReport, AllocationMode } from '../types';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle2,
  TableProperties,
  ArrowRight,
  TrendingUp,
  Package,
  PackagePlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RefillDemandReport } from './RefillDemandReport';

interface ExcelReportSheetViewProps {
  report: RedistributionReport;
  allocationMode: AllocationMode;
  onAllocationModeChange: (mode: AllocationMode) => void;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
}

export const ExcelReportSheetView: React.FC<ExcelReportSheetViewProps> = ({
  report,
  allocationMode,
  onAllocationModeChange,
  onSelectBranch,
  onSelectWeight
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<'report_breakdown' | 'refill_demand' | 'matrix' | 'branch_summary' | 'transfer_orders' | 'unmet_demand'>('report_breakdown');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithAction, setShowOnlyWithAction] = useState(false);

  // Matrix branches (excluding DWL warehouse from columns or keeping as needed)
  const branches = report.matrix.branches;
  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Particular';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  const weights = report.matrix.weights.filter(w => {
    const ws = report.weightSummaries.find(s => s.weight === w);
    if (!ws) return false;
    if (showOnlyWithAction) {
      return ws.moveInNeeded > 0 || ws.moveOutNeeded > 0 || ws.unmetShortage > 0;
    }
    return ws.soldQty > 0 || ws.currentStock > 0;
  });

  // Export full workbook with multiple native tabs matching Excel
  const handleExportFullExcelWorkbook = () => {
    const wb = XLSX.utils.book_new();

    // 0. Report Breakdown (Horizontal Multi-Branch Matrix)
    const targetBranches = branches.length > 0 ? branches : [
      'Bashundhara', 'Baily-Road', 'Baitul Mukarram', 'Bogura', 'Barishal', 'Chuadanga', 'Chittagong - #01'
    ];
    const targetCarats = weights.length > 0 ? weights : [
      '0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12'
    ];

    const breakdownRows: any[][] = [];
    breakdownRows.push(['Sales-Driven Distribution: Diamond Solitaire Earrings']);
    breakdownRows.push([]);
    breakdownRows.push(['01-05-2026 to 19-09-2026']);

    const row4: string[] = ['Particulars Name', 'DWL'];
    targetBranches.forEach(b => {
      row4.push(b, '', '', '', '');
    });
    row4.push('Total Stock', 'Total Sold', 'Refill Demand');
    breakdownRows.push(row4);

    const row5: string[] = ['', 'Stock'];
    targetBranches.forEach(() => {
      row5.push('SOLD QTY', 'Current Stock', 'Average', 'Contribution %', 'Move IN/OUT');
    });
    row5.push('', '', '');
    breakdownRows.push(row5);

    targetCarats.forEach(carat => {
      const dwlStock = report.matrix.cells['DWL']?.[carat]?.stock || 0;
      const r: any[] = [carat, dwlStock];
      let tStock = dwlStock;
      let tSold = 0;
      const totalSoldCarat = targetBranches.reduce((acc, br) => acc + (report.matrix.cells[br]?.[carat]?.sold || 0), 0);

      targetBranches.forEach(b => {
        const cell = report.matrix.cells[b]?.[carat];
        const sold = cell?.sold || 0;
        const stock = cell?.stock || 0;
        const avg = cell?.sales3M ? Math.round(cell.sales3M / 3) : Math.round(sold / 3);
        const contrib = totalSoldCarat > 0 ? `${((sold / totalSoldCarat) * 100).toFixed(0)}%` : '0%';
        const move = cell?.netMove || 0;

        tStock += stock;
        tSold += sold;
        r.push(sold, stock, avg, contrib, move);
      });
      const refillDemand = report.weightSummaries.find(w => w.weight === carat)?.unmetShortage || (tSold > tStock ? tSold - tStock : 0);
      r.push(tStock, tSold, refillDemand);
      breakdownRows.push(r);
    });

    const wsBreakdown = XLSX.utils.aoa_to_sheet(breakdownRows);
    wsBreakdown['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } },
    ];
    let colC = 2;
    targetBranches.forEach(() => {
      wsBreakdown['!merges']?.push({
        s: { r: 3, c: colC },
        e: { r: 3, c: colC + 4 }
      });
      colC += 5;
    });
    wsBreakdown['!merges']?.push({ s: { r: 3, c: colC }, e: { r: 4, c: colC } });
    wsBreakdown['!merges']?.push({ s: { r: 3, c: colC + 1 }, e: { r: 4, c: colC + 1 } });
    wsBreakdown['!merges']?.push({ s: { r: 3, c: colC + 2 }, e: { r: 4, c: colC + 2 } });
    XLSX.utils.book_append_sheet(wb, wsBreakdown, 'Report Breakdown');

    // 0.1 Dedicated Refill Demand Requisitions Sheet
    const refillRows: any[][] = [
      ['SL', 'Particulars', 'Sold Demand', 'Available Stock', 'Refill Demand (Qty)', 'Urgency', 'Requesting Branches', 'Replenishment Rationale']
    ];
    report.weightSummaries
      .filter(w => w.unmetShortage > 0 || (w.soldQty > 0 && w.currentStock === 0))
      .forEach((w, idx) => {
        const reqBranches = report.matrix.branches
          .filter(b => {
            const cell = report.matrix.cells[b]?.[w.weight];
            return cell && cell.sold > cell.stock;
          })
          .join(', ');
        refillRows.push([
          idx + 1,
          itemUnit === 'ct' ? `${w.weight} ct` : w.weight,
          w.soldQty,
          w.currentStock,
          w.unmetShortage || (w.soldQty > w.currentStock ? w.soldQty - w.currentStock : 0),
          w.currentStock === 0 ? 'CRITICAL' : 'HIGH',
          reqBranches || 'Central Stock Pool',
          w.currentStock === 0
            ? '100% Stockout: Customer demand with zero company stock. Refill needed immediately.'
            : 'Demand exceeds inventory. Urgent stock replenishment required.'
        ]);
      });
    const wsRefill = XLSX.utils.aoa_to_sheet(refillRows);
    XLSX.utils.book_append_sheet(wb, wsRefill, 'Refill Demand');

    // 1. Matrix Sheet
    const matrixRows: any[] = [];
    // Header
    const matrixHeader = [`Particulars (${itemLabel})`, ...branches, 'Total Move IN', 'Total Move OUT', 'New Buy Needed', 'Action Status'];
    matrixRows.push(matrixHeader);

    weights.forEach(w => {
      const ws = report.weightSummaries.find(s => s.weight === w);
      const row: any[] = [itemUnit === 'ct' ? `${w} ct` : w];
      let hasAction = false;

      branches.forEach(b => {
        const cell = report.matrix.cells[b]?.[w];
        const netMove = cell ? cell.netMove : 0;
        if (netMove !== 0) hasAction = true;
        row.push(netMove !== 0 ? netMove : 0);
      });

      row.push(ws?.moveInNeeded || 0);
      row.push(ws?.moveOutNeeded || 0);
      row.push(ws?.unmetShortage || 0);
      row.push(hasAction ? 'YES' : 'NO');
      matrixRows.push(row);
    });

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Redistribution Matrix');

    // 2. Branch Summary Sheet
    const branchRows: any[] = [
      ['Branch Name', 'Total Sold', 'Total Current Stock', `Move IN (${itemUnit})`, `Move OUT (${itemUnit})`, 'Net Change', 'Action Variants', 'Status']
    ];
    report.branchSummaries.forEach(b => {
      branchRows.push([
        b.branch,
        b.totalSold,
        b.totalCurrentStock,
        b.totalMoveIn,
        b.totalMoveOut,
        b.netChange,
        b.variantsNeedingAction,
        b.status
      ]);
    });
    // Add Grand Total
    branchRows.push([
      'Grand Total',
      report.totalSold,
      report.totalCurrentStock,
      report.totalMoveIn,
      report.totalMoveOut,
      report.netStockPosition,
      report.branchSummaries.reduce((acc, b) => acc + b.variantsNeedingAction, 0),
      'COMPANY COMPLETE'
    ]);
    const wsBranches = XLSX.utils.aoa_to_sheet(branchRows);
    XLSX.utils.book_append_sheet(wb, wsBranches, 'Branch Summary');

    // 3. Movement Transfers Sheet
    const transferRows: any[] = [
      ['Transfer ID', itemLabel, 'Move OUT (Donor)', 'Move IN (Receiver)', `Qty (${itemUnit})`, 'Priority', 'Reason', 'Status']
    ];
    report.transferOrders.forEach(t => {
      transferRows.push([t.id, t.weight, t.fromBranch, t.toBranch, t.qty, t.priority, t.reason, t.status]);
    });
    const wsTransfers = XLSX.utils.aoa_to_sheet(transferRows);
    XLSX.utils.book_append_sheet(wb, wsTransfers, 'Movement Summary');

    // 4. Demand & Procurement Sheet
    const demandRows: any[] = [
      [itemLabel, `New Stock to Buy (${itemUnit})`, 'Customer Demand (Sold)', 'Current Company Stock', 'Lost Revenue Urgency', 'Procurement Rationale']
    ];
    report.procurementOrders.forEach(p => {
      demandRows.push([itemUnit === 'ct' ? `${p.weight} ct` : p.weight, p.qtyToBuy, p.soldDemand, p.availableStock, p.urgency, p.rationale]);
    });
    const wsDemand = XLSX.utils.aoa_to_sheet(demandRows);
    XLSX.utils.book_append_sheet(wb, wsDemand, 'Unmet Demand (Procurement)');

    const filename = `${(report.categoryConfig?.name || 'Movement').replace(/[^a-zA-Z0-9]/g, '_')}_Analysis_Report_${report.period.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Export Sales-Driven Distribution: Diamond Solitaire Earrings side-by-side branch comparison matrix
  const handleExportSalesDrivenDistributionMatrix = () => {
    const wb = XLSX.utils.book_new();

    const targetBranches = branches.length > 0 ? branches : [
      'Bashundhara',
      'Baily-Road',
      'Baitul Mukarram',
      'Bogura',
      'Barishal',
      'Chuadanga',
      'Chittagong - #01'
    ];

    const targetCarats = weights.length > 0 ? weights : [
      '0.02', '0.03', '0.04', '0.05', '0.06',
      '0.07', '0.08', '0.09', '0.10', '0.11', '0.12'
    ];

    const rows: any[][] = [];

    // Row 1 & 2: Title Block
    rows.push(['Sales-Driven Distribution: Diamond Solitaire Earrings']);
    rows.push([]);
    // Row 3: Active Date Range
    rows.push(['01-05-2026 to 19-09-2026']);

    // Row 4: Top Grouping Headers
    const row4: string[] = ['Particulars Name', 'DWL'];
    targetBranches.forEach(b => {
      row4.push(b, '', '', '', '');
    });
    row4.push('Total Stock', 'Total Sold', 'Refill Demand');
    rows.push(row4);

    // Row 5: Sub Headers
    const row5: string[] = ['', 'Stock'];
    targetBranches.forEach(() => {
      row5.push('SOLD QTY', 'Current Stock', 'Average', 'Contribution %', 'Move IN/OUT');
    });
    row5.push('', '', '');
    rows.push(row5);

    // Row 6+: Particulars Rows
    targetCarats.forEach(carat => {
      const dwlStock = report.matrix.cells['DWL']?.[carat]?.stock || 0;
      const row: any[] = [carat, dwlStock];

      let totalStock = dwlStock;
      let totalSold = 0;

      const totalSoldForCarat = targetBranches.reduce((acc, br) => acc + (report.matrix.cells[br]?.[carat]?.sold || 0), 0);

      targetBranches.forEach(b => {
        const cell = report.matrix.cells[b]?.[carat];
        const soldQty = cell?.sold || 0;
        const currentStock = cell?.stock || 0;
        const avg = cell?.sales3M ? Math.round(cell.sales3M / 3) : Math.round(soldQty / 3);
        const contrib = totalSoldForCarat > 0 ? `${((soldQty / totalSoldForCarat) * 100).toFixed(1)}%` : '0%';
        const move = cell?.netMove || 0;

        totalStock += currentStock;
        totalSold += soldQty;

        row.push(soldQty, currentStock, avg, contrib, move);
      });

      const refillDemand = report.weightSummaries.find(w => w.weight === carat)?.unmetShortage || (totalSold > totalStock ? totalSold - totalStock : 0);
      row.push(totalStock, totalSold, refillDemand);
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set merged cells for top headers
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }, // Title block A1:B2
    ];

    let colIdx = 2;
    targetBranches.forEach(() => {
      ws['!merges']?.push({
        s: { r: 3, c: colIdx },
        e: { r: 3, c: colIdx + 4 }
      });
      colIdx += 5;
    });

    // Merge Total Stock, Total Sold & Refill Demand headers
    ws['!merges']?.push({ s: { r: 3, c: colIdx }, e: { r: 4, c: colIdx } });
    ws['!merges']?.push({ s: { r: 3, c: colIdx + 1 }, e: { r: 4, c: colIdx + 1 } });
    ws['!merges']?.push({ s: { r: 3, c: colIdx + 2 }, e: { r: 4, c: colIdx + 2 } });

    XLSX.utils.book_append_sheet(wb, ws, 'Distribution Matrix');
    XLSX.writeFile(wb, 'Sales_Driven_Distribution_Report.xlsx');
  };

  return (
    <div className="space-y-4">
      
      {/* DWL Analytical Reports Header & Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-teal-400 flex items-center justify-center font-bold shadow-sm">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  DWL Analytical Reports Hub
                </h2>
                <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 font-mono font-bold border border-slate-200 dark:border-slate-700 uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive multi-outlet stock allocation matrix, transfer manifests, and procurement order sheets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportSalesDrivenDistributionMatrix}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Download side-by-side multi-branch horizontal matrix (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Multi-Branch Matrix (.XLSX)</span>
            </button>

            <button
              onClick={handleExportFullExcelWorkbook}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-600 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Download full multi-sheet Microsoft Excel workbook"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Workbook (.XLSX)</span>
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Matrix allocation criteria — select to rebuild the full report</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              ['contribution', '① Sales Contribution', 'DWL-inclusive stock × branch sales share'],
              ['baseline', '② 3M Baseline', 'Average sales × 3, scale factor and bonus'],
              ['hybrid', '③ Hybrid', 'Higher target compressed to actual stock'],
            ] as [AllocationMode, string, string][]).map(([mode, label, detail]) => (
              <button key={mode} onClick={() => onAllocationModeChange(mode)} className={`rounded-md border px-3 py-2 text-left ${allocationMode === mode ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'}`}>
                <span className="block text-xs font-black">{label}</span><span className={`block mt-0.5 text-[10px] ${allocationMode === mode ? 'text-teal-100' : 'text-slate-500'}`}>{detail}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Summary Ribbon (ERP Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Stock</span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">{report.totalCurrentStock} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Sales Demand</span>
            <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{report.totalSold} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/50">
            <span className="text-[10px] font-semibold text-teal-700 dark:text-teal-400 uppercase block">Deficit Move-In</span>
            <span className="text-sm font-bold text-teal-700 dark:text-teal-300">+{report.totalMoveIn} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/50">
            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-400 uppercase block">Surplus Move-Out</span>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-300">-{report.totalMoveOut} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Transfer Orders</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{report.transferOrders.length} routes</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50">
            <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 uppercase block">New Buy Needed</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">{report.totalNewStockToBuy} {itemUnit}</span>
          </div>
        </div>

        {/* Excel Sheet Tabs (ERP Module Sheet Tabs) */}
        <div className="flex items-center justify-between gap-2 pt-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveSheetTab('report_breakdown')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'report_breakdown'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>Sheet 1: Report Breakdown</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('refill_demand')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'refill_demand'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Sheet 2: Refill Demand ({report.totalNewStockToBuy} {itemUnit})</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('matrix')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'matrix'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sheet 3: Redistribution Matrix</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('branch_summary')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'branch_summary'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Sheet 4: Branch 360 Summary</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('transfer_orders')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'transfer_orders'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Sheet 5: Transfer Orders ({report.transferOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveSheetTab('unmet_demand')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSheetTab === 'unmet_demand'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Sheet 6: Demand &amp; Procurement</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyWithAction}
                onChange={(e) => setShowOnlyWithAction(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Show only rows with action</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sheet 1: Report Breakdown (Side-by-Side Multi-Branch Comparison Matrix) */}
      {activeSheetTab === 'report_breakdown' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden space-y-3 p-4 sm:p-5">
          {/* Executive Title & Period Block (Matching Corporate Format) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-block border-2 border-slate-800 dark:border-slate-600 bg-[#cfe2f3] dark:bg-slate-800/90 text-slate-900 dark:text-white px-3.5 py-1.5 rounded-sm font-black text-sm sm:text-base shadow-sm">
                Sales-Driven Distribution: <span className="font-extrabold text-slate-950 dark:text-teal-300">Diamond Solitaire Earrings</span>
              </div>
              <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 mt-1.5 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  Active Period: 01-05-2026 to 19-09-2026
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Flat horizontal multi-branch inventory balance)
                </span>
              </div>
            </div>

            <button
              onClick={handleExportSalesDrivenDistributionMatrix}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              title="Download exact Excel matrix file (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report Breakdown (.XLSX)</span>
            </button>
          </div>

          {/* Side-by-Side Horizontal Branch Matrix Table */}
          <div className="overflow-x-auto border-2 border-slate-400 dark:border-slate-700 rounded-lg max-h-[640px] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse font-sans select-text">
              <thead className="sticky top-0 z-20 shadow-sm border-b-2 border-slate-400 dark:border-slate-600">
                {/* Row 4: Branch Grouping */}
                <tr className="bg-[#d9d9d9] dark:bg-slate-800 text-slate-900 dark:text-white text-center">
                  <th
                    rowSpan={2}
                    className="py-2.5 px-3 border border-slate-400 dark:border-slate-700 text-center font-black sticky left-0 bg-[#d9d9d9] dark:bg-slate-800 z-30 min-w-[130px] tracking-tight"
                  >
                    Particulars Name
                  </th>
                  <th
                    className="py-2 px-3 border border-slate-400 dark:border-slate-700 text-center font-black text-sm bg-[#d9d9d9] dark:bg-slate-800 min-w-[65px]"
                  >
                    DWL
                  </th>
                  {(branches.length > 0 ? branches : ['Bashundhara', 'Baily-Road', 'Baitul Mukarram', 'Bogura', 'Barishal', 'Chuadanga', 'Chittagong - #01']).map((b) => (
                    <th
                      key={`grp-${b}`}
                      colSpan={5}
                      className="py-2 px-3 border-x-2 border-y border-slate-500 dark:border-slate-600 text-center font-black text-sm bg-[#d9d9d9] dark:bg-slate-800 text-slate-900 dark:text-white tracking-tight"
                    >
                      {b}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="py-2 px-3 border border-slate-400 dark:border-slate-700 text-center font-bold italic bg-[#d9d9d9] dark:bg-slate-800 min-w-[85px]"
                  >
                    Total Stock
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2 px-3 border border-slate-400 dark:border-slate-700 text-center font-bold italic bg-[#d9d9d9] dark:bg-slate-800 min-w-[85px]"
                  >
                    Total Sold
                  </th>
                  <th
                    rowSpan={2}
                    className="py-2 px-3 border border-slate-400 dark:border-slate-700 text-center font-bold italic bg-amber-200 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 min-w-[95px]"
                  >
                    Refill Demand
                  </th>
                </tr>

                {/* Row 5: Metric Columns per Branch */}
                <tr className="bg-[#e7e6e6] dark:bg-slate-850 text-slate-800 dark:text-slate-200 text-[10px] font-bold text-center border-b-2 border-slate-400 dark:border-slate-600">
                  <th className="py-1.5 px-2 border border-slate-400 dark:border-slate-700">
                    Stock
                  </th>
                  {(branches.length > 0 ? branches : ['Bashundhara', 'Baily-Road', 'Baitul Mukarram', 'Bogura', 'Barishal', 'Chuadanga', 'Chittagong - #01']).map((b) => (
                    <React.Fragment key={`sub-${b}`}>
                      <th className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 min-w-[65px]">
                        SOLD QTY
                      </th>
                      <th className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 min-w-[70px]">
                        Current Stock
                      </th>
                      <th className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 min-w-[55px]">
                        Average
                      </th>
                      <th className="py-1.5 px-2 border border-slate-300 dark:border-slate-700 min-w-[75px]">
                        Contribution %
                      </th>
                      <th className="py-1.5 px-2 border-r-2 border-l border-y border-slate-400 dark:border-slate-600 min-w-[75px] bg-[#bfbfbf] dark:bg-slate-700 text-slate-900 dark:text-white">
                        Move IN/OUT
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              {/* Row 6+: Particulars Data Matrix */}
              <tbody className="divide-y divide-slate-300 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {(weights.length > 0 ? weights : ['0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12']).map((carat) => {
                  const dwlStock = report.matrix.cells['DWL']?.[carat]?.stock || 0;
                  const currentBranches = branches.length > 0 ? branches : ['Bashundhara', 'Baily-Road', 'Baitul Mukarram', 'Bogura', 'Barishal', 'Chuadanga', 'Chittagong - #01'];

                  let rowTotalStock = dwlStock;
                  let rowTotalSold = 0;

                  const totalSoldForCarat = currentBranches.reduce(
                    (acc, br) => acc + (report.matrix.cells[br]?.[carat]?.sold || 0),
                    0
                  );

                  return (
                    <tr key={carat} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/60 transition-colors">
                      {/* Particulars (Carat Size) */}
                      <td className="py-1.5 px-3 font-mono font-extrabold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border border-slate-300 dark:border-slate-700 text-center">
                        {carat}
                      </td>

                      {/* DWL Stock */}
                      <td className="py-1 px-2 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200">
                        {dwlStock}
                      </td>

                      {/* 5 Distinct Metrics for each branch */}
                      {currentBranches.map((b) => {
                        const cell = report.matrix.cells[b]?.[carat];
                        const sold = cell?.sold || 0;
                        const stock = cell?.stock || 0;
                        const avg = cell?.sales3M ? Math.round(cell.sales3M / 3) : Math.round(sold / 3);
                        const contrib = totalSoldForCarat > 0 ? `${((sold / totalSoldForCarat) * 100).toFixed(0)}%` : '0%';
                        const move = cell?.netMove || 0;

                        rowTotalStock += stock;
                        rowTotalSold += sold;

                        return (
                          <React.Fragment key={`cell-${b}-${carat}`}>
                            <td className="py-1 px-2 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                              {sold}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                              {stock}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 text-slate-500">
                              {avg}
                            </td>
                            <td className="py-1 px-2 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-medium">
                              {contrib}
                            </td>
                            <td
                              className={`py-1 px-2 text-right font-mono text-xs border-x-2 border-y border-slate-400 dark:border-slate-700 font-extrabold ${
                                move > 0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : move < 0
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {move > 0 ? `+${move}` : move}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      {/* Total Stock */}
                      <td className="py-1 px-3 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/40">
                        {rowTotalStock}
                      </td>

                      {/* Total Sold */}
                      <td className="py-1 px-3 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 font-extrabold text-blue-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-800/40">
                        {rowTotalSold}
                      </td>

                      {/* Refill Demand */}
                      {(() => {
                        const refillQty = report.weightSummaries.find(w => w.weight === carat)?.unmetShortage || (rowTotalSold > rowTotalStock ? rowTotalSold - rowTotalStock : 0);
                        return (
                          <td className={`py-1 px-3 text-right font-mono text-xs border border-slate-300 dark:border-slate-700 font-black ${
                            refillQty > 0
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : 'text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/40'
                          }`}>
                            {refillQty > 0 ? `+${refillQty}` : '0'}
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Row */}
              <tfoot className="bg-[#e7e6e6] dark:bg-slate-800 font-bold border-t-2 border-slate-400 dark:border-slate-600">
                <tr>
                  <td className="py-2 px-3 text-slate-900 dark:text-white font-black border border-slate-400 dark:border-slate-700 sticky left-0 bg-[#e7e6e6] dark:bg-slate-800 z-10 text-center">
                    Total
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-black border border-slate-400 dark:border-slate-700 text-slate-900 dark:text-white">
                    {(weights.length > 0 ? weights : ['0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12']).reduce(
                      (acc, c) => acc + (report.matrix.cells['DWL']?.[c]?.stock || 0),
                      0
                    )}
                  </td>
                  {(branches.length > 0 ? branches : ['Bashundhara', 'Baily-Road', 'Baitul Mukarram', 'Bogura', 'Barishal', 'Chuadanga', 'Chittagong - #01']).map((b) => {
                    const currentWeights = weights.length > 0 ? weights : ['0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.09', '0.10', '0.11', '0.12'];
                    const branchSold = currentWeights.reduce((acc, c) => acc + (report.matrix.cells[b]?.[c]?.sold || 0), 0);
                    const branchStock = currentWeights.reduce((acc, c) => acc + (report.matrix.cells[b]?.[c]?.stock || 0), 0);
                    const branchMove = currentWeights.reduce((acc, c) => acc + (report.matrix.cells[b]?.[c]?.netMove || 0), 0);

                    return (
                      <React.Fragment key={`foot-${b}`}>
                        <td className="py-2 px-2 text-right font-mono font-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                          {branchSold}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                          {branchStock}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black border border-slate-300 dark:border-slate-700 text-slate-500">
                          -
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black border border-slate-300 dark:border-slate-700 text-slate-500">
                          -
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-black border-x-2 border-y border-slate-400 dark:border-slate-600 bg-[#bfbfbf] dark:bg-slate-700 text-slate-900 dark:text-white">
                          {branchMove > 0 ? `+${branchMove}` : branchMove}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-mono font-black border border-slate-400 dark:border-slate-700 text-slate-900 dark:text-white">
                    {report.totalCurrentStock}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black border border-slate-400 dark:border-slate-700 text-blue-600 dark:text-cyan-400">
                    {report.totalSold}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-black border border-slate-400 dark:border-slate-700 bg-amber-200/60 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                    {report.totalNewStockToBuy}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Sheet 2: Refill Demand & Outlet Stock Requisitions */}
      {activeSheetTab === 'refill_demand' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <RefillDemandReport
            report={report}
            onSelectBranch={onSelectBranch}
            onSelectWeight={onSelectWeight}
          />
        </div>
      )}

      {/* Sheet 3: Matrix View (Classic Excel layout) */}
      {activeSheetTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
              Formula: [Sold &gt; Stock = Move IN (+1)] • [Stock &gt; Sold = Move OUT (-1)]
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Move IN (Deficit Restock)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Move OUT (Surplus Transfer)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[550px]">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="sticky top-0 bg-slate-200 dark:bg-slate-850 z-20 shadow-sm border-b border-slate-300 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-slate-200 dark:bg-slate-850 z-30 border-r border-slate-300 dark:border-slate-700 min-w-[130px]">
                    Particulars ({itemLabel})
                  </th>
                  {branches.map(b => (
                    <th
                      key={b}
                      onClick={() => onSelectBranch && onSelectBranch(b)}
                      title={`Click to view Branch ${b} detailed report`}
                      className="py-2 px-2 font-semibold text-slate-800 dark:text-slate-300 text-center min-w-[80px] border-r border-slate-300 dark:border-slate-700 text-[10px] whitespace-nowrap cursor-pointer hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors"
                    >
                      {b}
                    </th>
                  ))}
                  <th className="py-2 px-3 font-bold text-center bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 min-w-[70px]">
                    Move IN
                  </th>
                  <th className="py-2 px-3 font-bold text-center bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 min-w-[75px]">
                    Move OUT
                  </th>
                  <th className="py-2 px-3 font-bold text-center bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 min-w-[80px]">
                    New Buy
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {weights.map(w => {
                  const ws = report.weightSummaries.find(s => s.weight === w);

                  return (
                    <tr key={w} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td
                        onClick={() => onSelectWeight && onSelectWeight(w)}
                        title={`Click to view enterprise store availability for ${w} ct`}
                        className="py-1.5 px-3 font-mono font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 cursor-pointer hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                      >
                        {itemUnit === 'ct' ? `${w} ct` : w}
                      </td>

                      {branches.map(b => {
                        const cell = report.matrix.cells[b]?.[w];
                        const netMove = cell ? cell.netMove : 0;

                        return (
                          <td
                            key={b}
                            className={`py-1 px-2 text-center font-mono font-bold text-xs border-r border-slate-100 dark:border-slate-800 ${
                              netMove > 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold'
                                : netMove < 0
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold'
                                : 'text-slate-400/80'
                            }`}
                          >
                            {netMove > 0 ? `+${netMove}` : netMove < 0 ? `${netMove}` : '0'}
                          </td>
                        );
                      })}

                      <td className="py-1 px-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                        {ws?.moveInNeeded || 0}
                      </td>
                      <td className="py-1 px-3 text-center font-mono font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/20">
                        {ws?.moveOutNeeded || 0}
                      </td>
                      <td className="py-1 px-3 text-center font-mono font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">
                        {ws?.unmetShortage || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet 2: Branch Summary */}
      {activeSheetTab === 'branch_summary' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold text-[11px] border-b border-slate-700">
                  <th className="py-2.5 px-3">Branch Name</th>
                  <th className="py-2.5 px-3 text-center">Total Sold</th>
                  <th className="py-2.5 px-3 text-center">Current Stock</th>
                  <th className="py-2.5 px-3 text-center text-emerald-400">Move IN (Shortage)</th>
                  <th className="py-2.5 px-3 text-center text-rose-400">Move OUT (Surplus)</th>
                  <th className="py-2.5 px-3 text-center">Net Change</th>
                  <th className="py-2.5 px-3 text-center">Variants Needing Action</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.branchSummaries.map(b => (
                  <tr key={b.branch} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td
                      onClick={() => onSelectBranch && onSelectBranch(b.branch)}
                      title={`Click to open Branch ${b.branch} detailed report`}
                      className="py-2 px-3 font-semibold text-slate-900 dark:text-white cursor-pointer hover:text-cyan-400 hover:underline"
                    >
                      {b.branch}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                      {b.totalSold}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {b.totalCurrentStock}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-emerald-600">
                      {b.totalMoveIn > 0 ? `+${b.totalMoveIn}` : '0'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-rose-600">
                      {b.totalMoveOut > 0 ? `-${b.totalMoveOut}` : '0'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {b.netChange > 0 ? `+${b.netChange}` : b.netChange < 0 ? `${b.netChange}` : '0'}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      {b.variantsNeedingAction}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        b.status === 'OVERSTOCKED'
                          ? 'bg-rose-500/15 text-rose-600 border border-rose-400/30'
                          : b.status === 'SHORTAGE'
                          ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-400/30'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50 dark:bg-slate-850 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                <tr>
                  <td className="py-2.5 px-3 text-slate-900 dark:text-white font-extrabold">Grand Total</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-blue-600 dark:text-cyan-400">{report.totalSold}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-slate-900 dark:text-white">{report.totalCurrentStock}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-emerald-600">{report.totalMoveIn}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-rose-600">{report.totalMoveOut}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold">{report.netStockPosition}</td>
                  <td className="py-2.5 px-3 text-center font-mono font-extrabold">
                    {report.branchSummaries.reduce((a, b) => a + b.variantsNeedingAction, 0)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">Across {report.branchSummaries.length} Branches</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Sheet 3: Movement Summary (Transfer Orders) */}
      {activeSheetTab === 'transfer_orders' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Only movements with definite Move OUT donor and Move IN receiver
            </span>
            <span className="font-mono text-emerald-600 font-bold">
              {report.transferOrders.length} Active Transfer Orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold text-[11px] border-b border-slate-700">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">{itemLabel}</th>
                  <th className="py-2.5 px-3 text-rose-400">Move OUT (Donor)</th>
                  <th className="py-2.5 px-3 text-emerald-400">Move IN (Receiver)</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3">Redistribution Rationale</th>
                  <th className="py-2.5 px-3 text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.transferOrders.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{t.id}</td>
                    <td
                      onClick={() => onSelectWeight && onSelectWeight(t.weight)}
                      title={`Click to view enterprise store availability for ${t.weight} ct`}
                      className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-400 hover:underline"
                    >
                      {itemUnit === 'ct' ? `${t.weight} ct` : t.weight}
                    </td>
                    <td
                      onClick={() => onSelectBranch && onSelectBranch(t.fromBranch)}
                      title={`Click to open Branch ${t.fromBranch} report`}
                      className="py-2.5 px-3 font-semibold text-rose-600 cursor-pointer hover:underline"
                    >
                      {t.fromBranch}
                    </td>
                    <td
                      onClick={() => onSelectBranch && onSelectBranch(t.toBranch)}
                      title={`Click to open Branch ${t.toBranch} report`}
                      className="py-2.5 px-3 font-semibold text-emerald-600 cursor-pointer hover:underline"
                    >
                      {t.toBranch}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{t.qty} {itemUnit}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{t.reason}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        t.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-600' : 'bg-blue-500/20 text-blue-600'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sheet 4: Unmet Demand & Procurement */}
      {activeSheetTab === 'unmet_demand' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Demand that cannot be resolved through intra-company transfers (Total: {report.totalNewStockToBuy} {itemUnit})
            </span>
            <span className="font-mono text-amber-700 dark:text-amber-400 font-bold">
              Immediate Procurement Requisition
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold text-[11px] border-b border-slate-700">
                  <th className="py-2.5 px-3">{itemLabel}</th>
                  <th className="py-2.5 px-3 text-center">New Stock to Buy</th>
                  <th className="py-2.5 px-3 text-center">Sold Demand</th>
                  <th className="py-2.5 px-3 text-center">Available Stock</th>
                  <th className="py-2.5 px-3">Procurement Rationale</th>
                  <th className="py-2.5 px-3 text-right">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.procurementOrders.map(p => (
                  <tr key={p.weight} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {itemUnit === 'ct' ? `${p.weight} ct` : p.weight}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600">Buy {p.qtyToBuy} {itemUnit}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-600 dark:text-cyan-400">{p.soldDemand} sold</td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-500">{p.availableStock} in stock</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.rationale}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40">
                        {p.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
