import React, { useState, useMemo } from 'react';
import { RedistributionReport, AllocationMode } from '../types';
import { TableProperties, Download, Search, Warehouse, TrendingUp, CircleCheck as CheckCircle2, TriangleAlert as AlertTriangle, Building2, Package, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MasterMatrixViewProps {
  report: RedistributionReport;
  allocationMode: AllocationMode;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
}

interface MatrixRow {
  weight: string;
  weightLabel: string;
  totalStock: number;
  totalSold: number;
  dwlStock: number;
  branchData: {
    branch: string;
    stock: number;
    sold: number;
    dwlShare: number;
    totalAvailable: number;
    sufficient: boolean;
    isWarehouse: boolean;
  }[];
}

export const MasterMatrixView: React.FC<MasterMatrixViewProps> = ({
  report,
  allocationMode,
  onSelectBranch,
  onSelectWeight
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'stock' | 'sales' | 'both'>('both');

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / Particular';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  const isWarehouse = (b: string) => {
    const lower = b.toLowerCase().trim();
    return lower === 'dwl' || lower.startsWith('dwl ') || lower.endsWith(' dwl') ||
      lower.includes('warehouse') || lower.includes('central') || lower.includes('hub');
  };

  const retailBranches = useMemo(() =>
    report.matrix.branches.filter(b => !isWarehouse(b)),
    [report.matrix.branches]
  );

  const warehouseBranches = useMemo(() =>
    report.matrix.branches.filter(b => isWarehouse(b)),
    [report.matrix.branches]
  );

  // Build the master matrix data
  const matrixRows: MatrixRow[] = useMemo(() => {
    return report.matrix.weights.map(w => {
      const ws = report.weightSummaries.find(s => s.weight === w);
      const totalStock = ws?.currentStock || 0;
      const totalSold = ws?.soldQty || 0;

      // DWL / warehouse stock for this item
      const dwlStock = warehouseBranches.reduce((sum, b) => {
        const cell = report.matrix.cells[b]?.[w];
        return sum + (cell?.stock || 0);
      }, 0);

      // Distributable DWL stock = warehouse stock minus protected reserve
      const distributableDwl = Math.max(0, dwlStock);

      // Total retail sales for this item (used for share calculation)
      const totalRetailSold = retailBranches.reduce((sum, b) => {
        const cell = report.matrix.cells[b]?.[w];
        return sum + (cell?.sold || 0);
      }, 0);

      const branchData = retailBranches.map(branch => {
        const cell = report.matrix.cells[branch]?.[w];
        const stock = cell?.stock || 0;
        const sold = cell?.sold || 0;

        // DWL share = warehouse stock × (branch sales / total retail sales)
        const salesShare = totalRetailSold > 0 ? sold / totalRetailSold : 0;
        const dwlShare = Math.round(distributableDwl * salesShare);

        // Total available to this branch = own stock + DWL share
        const totalAvailable = stock + dwlShare;

        // Sufficient if total available >= sold demand
        const sufficient = totalAvailable >= sold;

        return { branch, stock, sold, dwlShare, totalAvailable, sufficient, isWarehouse: false };
      });

      const weightLabel = itemUnit === 'ct' ? `${w} ct` : w;
      return { weight: w, weightLabel, totalStock, totalSold, dwlStock, branchData };
    }).filter(row => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (!row.weight.toLowerCase().includes(q)) return false;
      }
      if (showOnlyIssues) {
        return row.branchData.some(b => !b.sufficient);
      }
      return row.totalStock > 0 || row.totalSold > 0;
    });
  }, [report, retailBranches, warehouseBranches, searchTerm, showOnlyIssues, itemUnit]);

  // Summary stats
  const totalNetworkStock = matrixRows.reduce((s, r) => s + r.totalStock, 0);
  const totalDwlStock = matrixRows.reduce((s, r) => s + r.dwlStock, 0);
  const totalRetailStock = totalNetworkStock - totalDwlStock;
  const totalSoldDemand = matrixRows.reduce((s, r) => s + r.totalSold, 0);
  const insufficientCount = matrixRows.filter(r => r.branchData.some(b => !b.sufficient)).length;

  const toggleRow = (weight: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(weight)) next.delete(weight);
      else next.add(weight);
      return next;
    });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Matrix — stock side-by-side
    const stockHeader: any[] = [
      `${itemLabel}`,
      'Total Stock',
      'DWL Stock',
      'Total Sold',
      ...retailBranches.map(b => `${b} Stock`),
      ...retailBranches.map(b => `${b} Sold`),
      ...retailBranches.map(b => `${b} DWL Share`),
      ...retailBranches.map(b => `${b} Available`),
      ...retailBranches.map(b => `${b} OK?`)
    ];
    const stockRows: any[] = [stockHeader];

    matrixRows.forEach(row => {
      const r: any[] = [row.weightLabel, row.totalStock, row.dwlStock, row.totalSold];
      row.branchData.forEach(b => r.push(b.stock));
      row.branchData.forEach(b => r.push(b.sold));
      row.branchData.forEach(b => r.push(b.dwlShare));
      row.branchData.forEach(b => r.push(b.totalAvailable));
      row.branchData.forEach(b => r.push(b.sufficient ? 'YES' : 'NO'));
      stockRows.push(r);
    });

    // Grand total row
    const grandRow: any[] = [
      'TOTAL',
      totalNetworkStock,
      totalDwlStock,
      totalSoldDemand,
      ...retailBranches.map(b => matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.stock || 0), 0)),
      ...retailBranches.map(b => matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.sold || 0), 0)),
      ...retailBranches.map(b => matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.dwlShare || 0), 0)),
      ...retailBranches.map(b => matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.totalAvailable || 0), 0)),
      ...retailBranches.map(() => '')
    ];
    stockRows.push(grandRow);

    const wsMatrix = XLSX.utils.aoa_to_sheet(stockRows);
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Master Matrix');

    // Sheet 2: DWL Stock Distribution
    const distRows: any[] = [
      [`${itemLabel}`, 'DWL Warehouse Stock', 'Total Retail Sold', 'Distribution Mode', ...retailBranches.map(b => `${b} Share`), ...retailBranches.map(b => `${b} Own Stock`), ...retailBranches.map(b => `${b} Total Available`), ...retailBranches.map(b => `${b} Sold`), ...retailBranches.map(b => `${b} Sufficient?`)]
    ];
    matrixRows.forEach(row => {
      const r: any[] = [row.weightLabel, row.dwlStock, row.totalSold, allocationMode];
      row.branchData.forEach(b => r.push(b.dwlShare));
      row.branchData.forEach(b => r.push(b.stock));
      row.branchData.forEach(b => r.push(b.totalAvailable));
      row.branchData.forEach(b => r.push(b.sold));
      row.branchData.forEach(b => r.push(b.sufficient ? 'YES' : 'SHORTAGE'));
      distRows.push(r);
    });
    const wsDist = XLSX.utils.aoa_to_sheet(distRows);
    XLSX.utils.book_append_sheet(wb, wsDist, 'DWL Stock Distribution');

    XLSX.writeFile(wb, `Master_Matrix_DWL_Distribution_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#17395c] text-white flex items-center justify-center shadow-sm">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Master Excel Matrix — Side-by-Side View
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total stock &amp; DWL warehouse stock divided among all branches by sales share. See who has stock, who needs stock, and if warehouse supply is sufficient.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-600 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Master Matrix (.xlsx)</span>
          </button>
        </div>

        {/* Summary ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 mt-4">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Network Stock</span>
            <span className="text-sm font-bold text-slate-800">{totalNetworkStock} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
            <span className="text-[10px] font-semibold text-indigo-400 uppercase block">DWL Warehouse</span>
            <span className="text-sm font-bold text-indigo-700">{totalDwlStock} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Retail Branch Stock</span>
            <span className="text-sm font-bold text-slate-800">{totalRetailStock} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
            <span className="text-[10px] font-semibold text-teal-400 uppercase block">Total Sold Demand</span>
            <span className="text-sm font-bold text-teal-700">{totalSoldDemand} {itemUnit}</span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-semibold text-rose-400 uppercase block">Items Short</span>
            <span className="text-sm font-bold text-rose-700">{insufficientCount} items</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${itemLabel}...`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#17395c]"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={showOnlyIssues}
                onChange={e => setShowOnlyIssues(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Only shortages</span>
            </label>
          </div>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-300 bg-white p-1 text-xs">
            {(['both', 'stock', 'sales'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                  viewMode === mode ? 'bg-[#17395c] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mode === 'both' ? 'Stock + Sales' : mode === 'stock' ? 'Stock Only' : 'Sales Only'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Master Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 text-xs font-mono text-slate-700 font-semibold flex items-center justify-between">
          <span>Formula: DWL Share = Warehouse Stock × (Branch Sales ÷ Total Retail Sales) | Available = Own Stock + DWL Share</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sufficient</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Shortage</span>
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-200 z-20 shadow-sm border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 font-bold text-slate-900 sticky left-0 bg-slate-200 z-30 border-r border-slate-300 min-w-[120px]">
                  {itemLabel}
                </th>
                <th className="py-2.5 px-2 text-center font-bold text-slate-700 bg-indigo-100 border-r border-slate-300 min-w-[70px]" title="DWL Warehouse Stock">
                  <Warehouse className="w-3.5 h-3.5 inline" /> DWL
                </th>
                <th className="py-2.5 px-2 text-center font-bold text-slate-700 min-w-[70px]" title="Total Company Stock">
                  Total
                </th>
                <th className="py-2.5 px-2 text-center font-bold text-teal-700 bg-teal-50 min-w-[70px]" title="Total Sold">
                  Sold
                </th>
                {retailBranches.map(b => (
                  <th key={b} className="py-2.5 px-2 text-center font-bold text-slate-600 min-w-[60px]" title={`Click to view ${b} details`}>
                    {b}
                  </th>
                ))}
                <th className="py-2.5 px-2 text-center font-bold text-slate-600 min-w-[60px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixRows.length === 0 ? (
                <tr>
                  <td colSpan={retailBranches.length + 5} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    No items match the current filter. All stock is sufficient.
                  </td>
                </tr>
              ) : (
                matrixRows.map(row => {
                  const isExpanded = expandedRows.has(row.weight);
                  const hasIssue = row.branchData.some(b => !b.sufficient);
                  return (
                    <React.Fragment key={row.weight}>
                      <tr
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${hasIssue ? 'bg-rose-50/30' : ''}`}
                        onClick={() => toggleRow(row.weight)}
                      >
                        <td className="py-2.5 px-3 sticky left-0 bg-inherit font-bold text-slate-900 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            <button
                              onClick={e => { e.stopPropagation(); onSelectWeight?.(row.weight); }}
                              className="hover:text-[#17395c] hover:underline font-mono"
                            >
                              {row.weightLabel}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center bg-indigo-50/50 border-r border-slate-200">
                          <span className="font-bold text-indigo-700 tabular-nums">{row.dwlStock}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold tabular-nums text-slate-700">{row.totalStock}</td>
                        <td className="py-2.5 px-2 text-center bg-teal-50/50">
                          <span className="font-bold text-teal-700 tabular-nums">{row.totalSold}</span>
                        </td>
                        {row.branchData.map(b => (
                          <td key={b.branch} className="py-2.5 px-2 text-center tabular-nums">
                            <button
                              onClick={e => { e.stopPropagation(); onSelectBranch?.(b.branch); }}
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border transition-all hover:scale-105 ${
                                b.sufficient
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title={`${b.branch}: Stock ${b.stock}, Sold ${b.sold}, DWL Share +${b.dwlShare}, Available ${b.totalAvailable}`}
                            >
                              {viewMode === 'stock' && `${b.stock}`}
                              {viewMode === 'sales' && `${b.sold}`}
                              {viewMode === 'both' && `${b.stock}/${b.sold}`}
                            </button>
                          </td>
                        ))}
                        <td className="py-2.5 px-2 text-center">
                          {hasIssue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" /> SHORT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={retailBranches.length + 5} className="py-3 px-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="text-slate-500 uppercase text-[10px] tracking-wide">
                                    <th className="py-1.5 px-2 text-left">Branch</th>
                                    <th className="py-1.5 px-2 text-right">Own Stock</th>
                                    <th className="py-1.5 px-2 text-right">Sold</th>
                                    <th className="py-1.5 px-2 text-right bg-indigo-50">DWL Share</th>
                                    <th className="py-1.5 px-2 text-right font-bold">Available</th>
                                    <th className="py-1.5 px-2 text-right">Shortage</th>
                                    <th className="py-1.5 px-2 text-center">Sufficient?</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {row.branchData.map(b => {
                                    const shortage = Math.max(0, b.sold - b.totalAvailable);
                                    return (
                                      <tr key={b.branch} className="hover:bg-white">
                                        <td className="py-1.5 px-2 font-bold text-slate-800">
                                          <button onClick={() => onSelectBranch?.(b.branch)} className="hover:text-[#17395c] hover:underline">
                                            {b.branch}
                                          </button>
                                        </td>
                                        <td className="py-1.5 px-2 text-right tabular-nums">{b.stock}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-teal-700 font-semibold">{b.sold}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums text-indigo-700 bg-indigo-50/50 font-semibold">+{b.dwlShare}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums font-bold text-slate-900">{b.totalAvailable}</td>
                                        <td className="py-1.5 px-2 text-right tabular-nums">
                                          {shortage > 0 ? <span className="text-rose-600 font-bold">−{shortage}</span> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="py-1.5 px-2 text-center">
                                          {b.sufficient ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                          ) : (
                                            <AlertTriangle className="w-4 h-4 text-rose-500 mx-auto" />
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                              <Warehouse className="w-3.5 h-3.5 text-indigo-500" />
                              <span>DWL warehouse has <strong className="text-indigo-700">{row.dwlStock} {itemUnit}</strong>. Divided by sales share: each branch gets a proportional slice. "Available" = own stock + DWL share.</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {matrixRows.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 text-xs font-bold sticky bottom-0">
                <tr>
                  <td className="py-2.5 px-3 sticky left-0 bg-slate-100 border-r border-slate-200">TOTAL</td>
                  <td className="py-2.5 px-2 text-center bg-indigo-50 border-r border-slate-200 text-indigo-700">{totalDwlStock}</td>
                  <td className="py-2.5 px-2 text-center text-slate-700">{totalNetworkStock}</td>
                  <td className="py-2.5 px-2 text-center bg-teal-50 text-teal-700">{totalSoldDemand}</td>
                  {retailBranches.map(b => {
                    const bStock = matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.stock || 0), 0);
                    const bSold = matrixRows.reduce((s, r) => s + (r.branchData.find(x => x.branch === b)?.sold || 0), 0);
                    return <td key={b} className="py-2.5 px-2 text-center tabular-nums text-slate-700">{bStock}/{bSold}</td>;
                  })}
                  <td className="py-2.5 px-2 text-center" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend & explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <TrendingUp className="w-4 h-4 text-[#17395c]" />
          <span>How DWL Warehouse Stock Is Divided</span>
        </div>
        <p className="leading-relaxed">
          1. <strong>DWL Share</strong> = Warehouse stock × (Branch Sales ÷ Total Retail Sales). Branches that sell more get a bigger share of warehouse stock.
        </p>
        <p className="leading-relaxed">
          2. <strong>Available</strong> = Branch's own stock + DWL share. This is what the branch can access without buying new stock.
        </p>
        <p className="leading-relaxed">
          3. <strong>Sufficient?</strong> = Yes if Available ≥ Sold demand. If not, the branch needs either a transfer from another branch or a new purchase order.
        </p>
        <p className="leading-relaxed">
          4. Click any row to expand and see per-branch breakdown. Click a branch code to open the branch detail report.
        </p>
      </div>
    </div>
  );
};
