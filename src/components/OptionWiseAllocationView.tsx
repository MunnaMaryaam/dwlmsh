import React, { useMemo, useState, useEffect } from 'react';
import { RedistributionReport, SalesTimeframe, AllocationMode } from '../types';
import { getOptionAllocationSummary } from '../utils/redistributionEngine';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Download,
  Filter,
  Home,
  Package,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Warehouse,
  XCircle,
} from 'lucide-react';

interface OptionWiseAllocationViewProps {
  report: RedistributionReport;
  selectedWeight?: string;
  selectedTimeframe?: SalesTimeframe;
  onTimeframeChange?: (tf: SalesTimeframe) => void;
  allocationMode?: AllocationMode;
  onAllocationModeChange?: (mode: AllocationMode) => void;
  onSelectBranch?: (branch: string) => void;
  onSelectWeight?: (weight: string) => void;
  onBackToHome?: () => void;
}

const fmt = (n: number, digits = 0) => Number(n || 0).toLocaleString(undefined, {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
});

/** Format Net_Move as "+9" / "-21" / "0" per Excel output rules */
const fmtNetMove = (netMove: number): string => {
  const n = Math.round(netMove);
  if (n > 0) return `+${n}`;
  if (n < 0) return `${n}`;
  return '0';
};

export const OptionWiseAllocationView: React.FC<OptionWiseAllocationViewProps> = ({
  report,
  selectedWeight: initialWeight = '',
  selectedTimeframe: globalTimeframe = '3M',
  onTimeframeChange,
  allocationMode: globalMode = 'contribution',
  onAllocationModeChange,
  onSelectBranch,
  onSelectWeight,
  onBackToHome,
}) => {
  const items = report.matrix.weights;
  const [activeItem, setActiveItem] = useState(initialWeight && items.includes(initialWeight) ? initialWeight : items[0] || '');
  // Use global Sales Period + Allocation Mode so header and this view stay in sync
  const timeframe = globalTimeframe;
  const setTimeframe = (tf: SalesTimeframe) => {
    onTimeframeChange?.(tf);
  };
  const allocationMode = globalMode;
  const setAllocationMode = (m: AllocationMode) => {
    onAllocationModeChange?.(m);
  };
  const [growthMultiplier, setGrowthMultiplier] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERSTOCK' | 'LESS_STOCK' | 'BALANCED' | 'WAREHOUSE'>('ALL');

  // When new data is imported, report.matrix.weights changes — keep activeItem in sync
  // so allocation analysis never shows empty / stale item results.
  useEffect(() => {
    if (items.length === 0) {
      setActiveItem('');
      return;
    }
    if (initialWeight && items.includes(initialWeight)) {
      setActiveItem(initialWeight);
    } else if (!items.includes(activeItem)) {
      setActiveItem(items[0]);
    }
  }, [items.join('|'), initialWeight, report.period]);

  const allocation = useMemo(() => {
    return getOptionAllocationSummary(report, activeItem, timeframe, growthMultiplier, allocationMode);
  }, [report, activeItem, timeframe, growthMultiplier, allocationMode]);

  const itemLabel = report.categoryConfig?.itemLabel || 'Item / SKU / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'pcs';

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allocation.rows.filter(row => {
      const qMatch = !q || row.branch.toLowerCase().includes(q);
      const sMatch = statusFilter === 'ALL' || row.status === statusFilter;
      return qMatch && sMatch;
    });
  }, [allocation.rows, query, statusFilter]);

  const statusCounts = useMemo(() => allocation.rows.reduce((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, { OVERSTOCK: 0, LESS_STOCK: 0, BALANCED: 0, WAREHOUSE: 0 } as Record<'OVERSTOCK' | 'LESS_STOCK' | 'BALANCED' | 'WAREHOUSE', number>), [allocation.rows]);

  const withdrawRows = useMemo(
    () => filteredRows.filter((r) => r.action === 'WITHDRAW' && r.actionQty > 0)
      .sort((a, b) => b.actionQty - a.actionQty),
    [filteredRows]
  );
  const receiveRows = useMemo(
    () => filteredRows.filter((r) => r.action === 'SEND' && r.actionQty > 0)
      .sort((a, b) => b.actionQty - a.actionQty),
    [filteredRows]
  );
  const totalWithdraw = useMemo(
    () => withdrawRows.reduce((s, r) => s + r.actionQty, 0),
    [withdrawRows]
  );
  const totalReceive = useMemo(
    () => receiveRows.reduce((s, r) => s + r.actionQty, 0),
    [receiveRows]
  );

  const changeItem = (value: string) => {
    setActiveItem(value);
    onSelectWeight?.(value);
  };

  const exportCsv = () => {
    const headers = [
      'Branch', 'Current Stock', 'Sold Qty (3M)', 'Sales Avg / Month', 'Sales Contribution %',
      'Contribution Deserve Qty', 'Safety Floor Qty', 'Cap Qty', 'Final Deserve Qty',
      'Variance', 'Status', 'Flag', 'Scaled Factor', 'Action', 'Action Qty', 'Rationale'
    ];
    const rows = allocation.rows.map(r => [
      r.branch, r.currentStock, r.sales3M, r.salesAvgMonthly, `${r.salesContributionPct}%`,
      r.contributionDeserveQty, r.safetyFloorQty, r.capQty ?? '', r.deservedStock,
      r.variance, r.status, r.statusFlag, r.scaledFactor, r.action, r.actionQty,
      `"${r.rationale.replaceAll('"', '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Universal_Allocation_${activeItem || 'item'}_${timeframe}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4" id="prd-allocation-workspace">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-5 bg-gradient-to-r from-slate-950 via-slate-900 to-[#17395c] text-white">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-300 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                PRD Allocation Engine
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">Dynamic Inventory Redistribution</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-300">
                Universal item-level analysis using live enterprise stock, 3-month velocity, sales contribution, safety protection and fair low-velocity allocation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onBackToHome && (
                <button onClick={onBackToHome} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-800">
                  <Home className="w-4 h-4" /> Home
                </button>
              )}
              <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                <Download className="w-4 h-4" /> Export Allocation
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 space-y-3">
          {/* 3 Distribution Mode Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Distribution Mode:</span>
            {([
              { id: 'contribution' as AllocationMode, label: '① Contribution', desc: '(DWL + all branches stock) × sales share %' },
              { id: 'baseline' as AllocationMode, label: '② Baseline (Period)', desc: 'Keep stock ≈ uploaded period sales at each branch' },
              { id: 'hybrid' as AllocationMode, label: '③ Hybrid', desc: 'max(contribution, baseline) then compress to live stock' }
            ]).map(m => (
              <button
                key={m.id}
                type="button"
                title={m.desc}
                onClick={() => setAllocationMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  allocationMode === m.id
                    ? 'bg-[#17395c] text-white border-[#17395c] shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-[#17395c] hover:text-[#17395c]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr_auto] gap-3">
            <label className="relative block">
              <span className="sr-only">Select item</span>
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select value={activeItem} onChange={e => changeItem(e.target.value)} className="w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#17395c]">
                {items.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <div className="flex rounded-lg border border-slate-300 bg-white p-1">
              {(['1M', '3M', '6M', '9M', '1Y'] as SalesTimeframe[]).map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf)} className={`flex-1 rounded-md px-3 py-2 text-xs font-bold ${timeframe === tf ? 'bg-[#17395c] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-600">Growth</span>
              <select value={growthMultiplier} onChange={e => setGrowthMultiplier(Number(e.target.value))} className="bg-transparent text-sm font-bold text-slate-900 outline-none">
                <option value={1}>1.0× Base</option>
                <option value={1.25}>1.25× Growth</option>
                <option value={1.5}>1.5× Push</option>
                <option value={2}>2.0× Aggressive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-2 xl:grid-cols-5 gap-3">
          <Metric label="Total Item Stock (DWL+All)" value={`${fmt(allocation.totalCompanyStock)} ${itemUnit}`} icon={<Warehouse className="w-4 h-4" />} />
          <Metric label="DWL Warehouse Stock" value={`${fmt(allocation.warehouseStock || 0)} ${itemUnit}`} icon={<Building2 className="w-4 h-4" />} />
          <Metric label={`${timeframe} Sales (Retail)`} value={fmt(allocation.totalSoldPeriod)} icon={<TrendingUp className="w-4 h-4" />} />
          <Metric label="Compression Factor" value={`${allocation.scaledCompressionFactor.toFixed(3)}×`} icon={<Filter className="w-4 h-4" />} />
          <Metric label="Protected Reserve" value={`${fmt(allocation.protectedReserve)} ${itemUnit}`} icon={<ShieldCheck className="w-4 h-4" />} />        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatusCard label="⚠️ Overstock" count={statusCounts.OVERSTOCK} active={statusFilter === 'OVERSTOCK'} onClick={() => setStatusFilter(statusFilter === 'OVERSTOCK' ? 'ALL' : 'OVERSTOCK')} />
        <StatusCard label="📉 Less Stock" count={statusCounts.LESS_STOCK} active={statusFilter === 'LESS_STOCK'} onClick={() => setStatusFilter(statusFilter === 'LESS_STOCK' ? 'ALL' : 'LESS_STOCK')} />
        <StatusCard label="✓ Balanced" count={statusCounts.BALANCED} active={statusFilter === 'BALANCED'} onClick={() => setStatusFilter(statusFilter === 'BALANCED' ? 'ALL' : 'BALANCED')} />
        <StatusCard label="🏢 Warehouse" count={statusCounts.WAREHOUSE} active={statusFilter === 'WAREHOUSE'} onClick={() => setStatusFilter(statusFilter === 'WAREHOUSE' ? 'ALL' : 'WAREHOUSE')} />
      </div>

      {/* ── Withdraw / Receive summary strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-amber-700" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-800">Withdraw (OUT)</div>
              <div className="text-[11px] text-amber-700/80">{withdrawRows.length} branch · excess to pull</div>
            </div>
          </div>
          <div className="text-xl font-bold text-amber-900 font-mono">{fmt(totalWithdraw)} <span className="text-xs font-semibold">{itemUnit}</span></div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-rose-700" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-rose-800">Receive (IN)</div>
              <div className="text-[11px] text-rose-700/80">{receiveRows.length} branch · shortage to fill</div>
            </div>
          </div>
          <div className="text-xl font-bold text-rose-900 font-mono">{fmt(totalReceive)} <span className="text-xs font-semibold">{itemUnit}</span></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Branch Allocation Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Current vs Target · <strong className="text-[#17395c]">Withdraw</strong> = excess pull · <strong className="text-rose-700">Receive</strong> = shortage fill · Mode: {allocationMode}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search branch" className="w-56 rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-[#17395c]" />
            </div>
            {(query || statusFilter !== 'ALL') && (
              <button onClick={() => { setQuery(''); setStatusFilter('ALL'); }} className="p-2 rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50" title="Clear filters">
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 z-10">Branch</th>
                <th className="px-3 py-3 text-right">Sold ({timeframe})</th>
                <th className="px-3 py-3 text-right">Avg / Mo</th>
                <th className="px-3 py-3 text-right">Current</th>
                <th className="px-3 py-3 text-right">Target</th>
                <th className="px-3 py-3 text-right bg-amber-50 text-amber-800">Withdraw</th>
                <th className="px-3 py-3 text-right bg-rose-50 text-rose-800">Receive</th>
                <th className="px-3 py-3 text-right">Net</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map(row => {
                const withdrawQty = row.action === 'WITHDRAW' ? row.actionQty : 0;
                const receiveQty = row.action === 'SEND' ? row.actionQty : 0;
                const net = row.deservedStock - row.currentStock;
                return (
                  <tr
                    key={row.branch}
                    className={`hover:bg-slate-50/80 ${
                      row.action === 'WITHDRAW' ? 'bg-amber-50/30' :
                      row.action === 'SEND' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="px-4 py-3 sticky left-0 bg-inherit font-bold text-slate-900">
                      <button type="button" onClick={() => onSelectBranch?.(row.branch)} className="text-left hover:text-[#17395c]">
                        {row.branch}
                      </button>
                      {row.status === 'WAREHOUSE' && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Warehouse</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{fmt(row.salesPeriod)}</td>
                    <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{fmt(row.salesAvgMonthly, 1)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">{fmt(row.currentStock)}</td>
                    <td className="px-3 py-3 text-right font-bold text-[#17395c] tabular-nums">{fmt(row.deservedStock)}</td>
                    <td className="px-3 py-3 text-right font-bold font-mono tabular-nums bg-amber-50/50 text-amber-800">
                      {withdrawQty > 0 ? `−${fmt(withdrawQty)}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-bold font-mono tabular-nums bg-rose-50/50 text-rose-800">
                      {receiveQty > 0 ? `+${fmt(receiveQty)}` : '—'}
                    </td>
                    <td className={`px-3 py-3 text-right font-bold font-mono tabular-nums ${
                      net > 0 ? 'text-rose-700' : net < 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      {fmtNetMove(net)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${
                        row.status === 'OVERSTOCK' ? 'bg-amber-100 text-amber-800' :
                        row.status === 'LESS_STOCK' ? 'bg-rose-100 text-rose-800' :
                        row.status === 'WAREHOUSE' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {row.status === 'OVERSTOCK' ? 'Overstock' :
                         row.status === 'LESS_STOCK' ? 'Need stock' :
                         row.status === 'WAREHOUSE' ? 'Warehouse' : 'Balanced'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 text-xs font-bold">
                <tr>
                  <td className="px-4 py-2.5 sticky left-0 bg-slate-100">Total (filtered)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(filteredRows.reduce((s, r) => s + r.salesPeriod, 0))}</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmt(filteredRows.reduce((s, r) => s + r.currentStock, 0))}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#17395c]">{fmt(filteredRows.reduce((s, r) => s + r.deservedStock, 0))}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-amber-800 bg-amber-50/80">−{fmt(totalWithdraw)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-rose-800 bg-rose-50/80">+{fmt(totalReceive)}</td>
                  <td className="px-3 py-2.5" colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {filteredRows.length === 0 && (
          <div className="px-6 py-14 text-center text-sm text-slate-500">No branches match the current filter.</div>
        )}
      </div>

      {/* ── Transfer dispatch table ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[#17395c]" />
            <div>
              <h3 className="font-bold text-slate-900">Transfer / Dispatch List</h3>
              <p className="text-xs text-slate-500">
                Overstock branch → shortage branch · before new factory buy · {allocation.transferPairs.length} move{allocation.transferPairs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {allocation.transferPairs.length > 0 && (
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              Total move: {fmt(allocation.transferPairs.reduce((s, p) => s + p.qty, 0))} {itemUnit}
            </span>
          )}
        </div>

        {allocation.transferPairs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No inter-branch transfer needed for this item under current mode.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left w-12">#</th>
                  <th className="px-3 py-2.5 text-left">From (Withdraw)</th>
                  <th className="px-3 py-2.5 text-center w-10" />
                  <th className="px-3 py-2.5 text-left">To (Receive)</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-left">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocation.transferPairs.map((pair, idx) => (
                  <tr key={`${pair.fromBranch}-${pair.toBranch}-${idx}`} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => onSelectBranch?.(pair.fromBranch)} className="font-bold text-amber-800 hover:underline">
                        {pair.fromBranch}
                      </button>
                      <span className="ml-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">OUT</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-400">→</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => onSelectBranch?.(pair.toBranch)} className="font-bold text-rose-800 hover:underline">
                        {pair.toBranch}
                      </button>
                      <span className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">IN</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="inline-flex items-center rounded-lg bg-slate-900 text-white px-2.5 py-1 text-sm font-bold font-mono">
                        {fmt(pair.qty)} {itemUnit}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[280px] truncate">{pair.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Side panels: action lists + rules ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2 mb-3">
            <ArrowUpFromLine className="w-4 h-4" /> Withdraw list
          </h3>
          {withdrawRows.length === 0 ? (
            <p className="text-xs text-slate-500">No excess to withdraw.</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {withdrawRows.map((r) => (
                <li key={r.branch} className="flex items-center justify-between text-xs rounded-lg bg-amber-50 px-2.5 py-2">
                  <button type="button" onClick={() => onSelectBranch?.(r.branch)} className="font-bold text-slate-800 hover:text-[#17395c] truncate">
                    {r.branch}
                  </button>
                  <span className="font-mono font-bold text-amber-800 shrink-0">−{fmt(r.actionQty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-rose-900 text-sm flex items-center gap-2 mb-3">
            <ArrowDownToLine className="w-4 h-4" /> Receive list
          </h3>
          {receiveRows.length === 0 ? (
            <p className="text-xs text-slate-500">No shortage to fill.</p>
          ) : (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {receiveRows.map((r) => (
                <li key={r.branch} className="flex items-center justify-between text-xs rounded-lg bg-rose-50 px-2.5 py-2">
                  <button type="button" onClick={() => onSelectBranch?.(r.branch)} className="font-bold text-slate-800 hover:text-[#17395c] truncate">
                    {r.branch}
                  </button>
                  <span className="font-mono font-bold text-rose-800 shrink-0">+{fmt(r.actionQty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Engine rules
          </h3>
          <div className="grid gap-2 text-[11px] text-slate-600">
            <Rule number="01" title="DWL = Warehouse" text={`Central reserve. Pool = showrooms + DWL (${fmt(allocation.totalCompanyStock)} pcs).`} />
            <Rule number="02" title="Contribution" text="Target = Total stock × (branch sales ÷ retail sales)." />
            <Rule number="03" title="Baseline" text="Target ≈ uploaded period sales at that branch (coverage stock)." />
            <Rule number="04" title="Hybrid" text="max(Contribution, Baseline), then compress to live stock." />
            <Rule number="05" title="Net" text={`Target − Current → +IN / −OUT. Mode: ${allocationMode}.`} />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-950 text-slate-200 px-4 py-3 text-xs flex flex-wrap items-center gap-x-6 gap-y-2">
        <span><strong className="text-white">{itemLabel}:</strong> {activeItem || '—'}</span>
        <span><strong className="text-white">Analysis:</strong> {timeframe}</span>
        <span><strong className="text-white">Warehouse distributable:</strong> {fmt(allocation.distributableWarehouseStock)} {itemUnit}</span>
        <span><strong className="text-white">Reserve protected:</strong> {fmt(allocation.protectedReserve)} {itemUnit}</span>
      </div>
    </section>
  );
};

const Metric: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase tracking-wide">{icon}{label}</div>
    <div className="mt-2 text-lg font-bold text-slate-900">{value}</div>
  </div>
);

const StatusCard: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({ label, count, active, onClick }) => (
  <button onClick={onClick} className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-[#17395c] bg-[#eef4f9] shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
    <div className="text-xs font-bold text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-slate-900">{fmt(count)}</div>
  </button>
);

const Rule: React.FC<{ number: string; title: string; text: string }> = ({ number, title, text }) => (
  <div className="flex gap-3 rounded-lg border border-slate-200 p-3">
    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{number}</div>
    <div><div className="font-bold text-slate-800">{title}</div><div className="mt-0.5">{text}</div></div>
  </div>
);
