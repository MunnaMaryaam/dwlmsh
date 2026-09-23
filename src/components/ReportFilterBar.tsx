import React, { useMemo, useState, useEffect } from 'react';
import { Building2, Gem, ListFilter as Filter, X, Search, Layers, RefreshCw } from 'lucide-react';
import { RawInventoryRecord } from '../types';

export interface ReportFilters {
  branchId: string;       // '' = all branches
  ctsFrom: string;        // numeric string, e.g. "0.02"
  ctsTo: string;          // numeric string, e.g. "0.20"
  mainCategory: string;   // '' = all (future-ready)
  subCategory: string;    // '' = all (future-ready)
}

interface ReportFilterBarProps {
  rawRecords: RawInventoryRecord[];
  filters: ReportFilters;
  onFiltersChange: (f: ReportFilters) => void;
  filteredCount: number;
  totalCount: number;
}

/** Parse weight/carat string to number (handles "0.24", "0.24 ct", "24 cent" etc.) */
export function parseCaratValue(weight: string): number | null {
  if (!weight) return null;
  const cleaned = String(weight).replace(/[^\d.]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

const isWarehouseBranchName = (branch: string) => {
  const lower = (branch || '').toLowerCase().trim();
  return (
    lower === 'dwl' ||
    lower.startsWith('dwl ') ||
    lower.endsWith(' dwl') ||
    lower.includes('warehouse') ||
    lower.includes('central') ||
    lower.includes('hub')
  );
};

/** Apply branch + cts range (+ optional category) filters to raw upload records.
 *  When a retail Branch ID is set, DWL warehouse rows for the same cts range
 *  are still kept so distribution pool (total stock) stays correct.
 */
export function applyReportFilters(
  records: RawInventoryRecord[],
  filters: ReportFilters
): RawInventoryRecord[] {
  const fromN = filters.ctsFrom.trim() !== '' ? parseFloat(filters.ctsFrom) : null;
  const toN = filters.ctsTo.trim() !== '' ? parseFloat(filters.ctsTo) : null;
  const branchQ = filters.branchId.trim().toLowerCase();
  const mainCat = filters.mainCategory.trim().toLowerCase();
  const subCat = filters.subCategory.trim().toLowerCase();

  return records.filter((r) => {
    const isWh = isWarehouseBranchName(r.branch);

    // Branch ID filter — always keep DWL/warehouse for distribution pool
    if (branchQ) {
      const b = (r.branch || '').toLowerCase();
      if (!isWh && !b.includes(branchQ) && b !== branchQ) return false;
    }

    // Diamond Cts / Item range filter (applies to retail AND warehouse)
    if (fromN != null || toN != null) {
      const w = parseCaratValue(r.weight);
      if (w == null) return false;
      if (fromN != null && w < fromN) return false;
      if (toN != null && w > toN) return false;
    }

    // Main category (when present on records)
    if (mainCat) {
      const c = (r.category || '').toLowerCase();
      if (!c.includes(mainCat)) return false;
    }

    // Sub / variant
    if (subCat) {
      const v = (r.variant || r.itemName || '').toLowerCase();
      if (!v.includes(subCat)) return false;
    }

    return true;
  });
}

export const EMPTY_FILTERS: ReportFilters = {
  branchId: '',
  ctsFrom: '',
  ctsTo: '',
  mainCategory: '',
  subCategory: ''
};

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  rawRecords,
  filters,
  onFiltersChange,
  filteredCount,
  totalCount
}) => {
  // Local draft so user can type before Apply (NetSuite style)
  const [draft, setDraft] = useState<ReportFilters>(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.branch) set.add(r.branch);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawRecords]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rawRecords]);

  const caratOptions = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.weight) set.add(String(r.weight).trim());
    });
    return Array.from(set).sort((a, b) => {
      const na = parseFloat(a);
      const nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
  }, [rawRecords]);

  const variantOptions = useMemo(() => {
    const set = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.variant) set.add(r.variant);
      if (r.itemName) set.add(r.itemName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b)).slice(0, 200);
  }, [rawRecords]);

  const hasActive =
    filters.branchId ||
    filters.ctsFrom ||
    filters.ctsTo ||
    filters.mainCategory ||
    filters.subCategory;

  const handleApply = () => {
    onFiltersChange({ ...draft });
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    onFiltersChange(EMPTY_FILTERS);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply();
  };

  return (
    <div
      id="netsuite-report-filter-bar"
      className="rounded-xl border border-[#d4af37]/25 bg-white shadow-sm overflow-hidden text-[#1e293b]"
    >
      <div className="bg-gradient-to-r from-[#0a0a0c] via-[#17395c] to-[#0f2b48] text-white px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>Intelligence Filters</span>
          <span className="hidden sm:inline text-[10px] font-normal text-white/60">· Branch · Carat · Category</span>
        </span>
        <span className="text-[10px] font-mono text-[#d4af37]/90">
          {filteredCount.toLocaleString()} / {totalCount.toLocaleString()} records
          {hasActive ? ' · filtered' : ''}
        </span>
      </div>

      <div className="p-4 space-y-3 bg-[#f8f9fb]">
        {/* Row 1: Branch + Cts Range (priority filters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
          {/* Branch ID */}
          <div>
            <label className="text-[10px] font-bold text-[#334155] flex items-center gap-1 mb-0.5">
              <Building2 className="w-3 h-3 text-[#17395c]" />
              Branch ID
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                list="branch-id-options"
                value={draft.branchId}
                onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                onKeyDown={handleKeyDown}
                placeholder="e.g. GUL, DWL, ONL"
                className="flex-1 bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#17395c]"
              />
              <datalist id="branch-id-options">
                {branchOptions.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Diamond Cts From — suggestions from uploaded data */}
          <div>
            <label className="text-[10px] font-bold text-[#334155] flex items-center gap-1 mb-0.5">
              <Gem className="w-3 h-3 text-amber-600" />
              Diamond Cts. From
            </label>
            <input
              type="text"
              list="cts-from-options"
              inputMode="decimal"
              value={draft.ctsFrom}
              onChange={(e) => setDraft({ ...draft, ctsFrom: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="0.02 — click for suggestions"
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#17395c]"
            />
            <datalist id="cts-from-options">
              {caratOptions.map((c) => (
                <option key={`from-${c}`} value={c} />
              ))}
            </datalist>
          </div>

          {/* Diamond Cts To */}
          <div>
            <label className="text-[10px] font-bold text-[#334155] flex items-center gap-1 mb-0.5">
              <Gem className="w-3 h-3 text-amber-600" />
              Diamond Cts. To
            </label>
            <input
              type="text"
              list="cts-to-options"
              inputMode="decimal"
              value={draft.ctsTo}
              onChange={(e) => setDraft({ ...draft, ctsTo: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="0.20 — click for suggestions"
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-xs font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#17395c]"
            />
            <datalist id="cts-to-options">
              {caratOptions.map((c) => (
                <option key={`to-${c}`} value={c} />
              ))}
            </datalist>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#17395c] hover:bg-[#0f2b48] text-white text-xs font-bold transition-colors shadow-sm border border-[#d4af37]/20"
            >
              <Search className="w-3.5 h-3.5" />
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasActive && !draft.branchId && !draft.ctsFrom && !draft.ctsTo}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-white border border-[#e2e8f0] text-[#475569] text-xs font-bold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              title="Clear all filters"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Row 2: Main / Sub Category (ready for gradual expansion) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
          <div>
            <label className="text-[10px] font-bold text-[#334155] flex items-center gap-1 mb-0.5">
              <Layers className="w-3 h-3 text-slate-500" />
              Main Category
            </label>
            <input
              type="text"
              list="main-cat-options"
              value={draft.mainCategory}
              onChange={(e) => setDraft({ ...draft, mainCategory: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Diamond / Gold / Platinum (optional)"
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#17395c]"
            />
            <datalist id="main-cat-options">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
              <option value="Diamond" />
              <option value="Gold" />
              <option value="Platinum" />
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#334155] flex items-center gap-1 mb-0.5">
              <Layers className="w-3 h-3 text-slate-500" />
              Sub Category
            </label>
            <input
              type="text"
              value={draft.subCategory}
              onChange={(e) => setDraft({ ...draft, subCategory: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="Optional — variant / style"
              className="w-full bg-white border border-[#e2e8f0] rounded-lg px-2.5 py-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#17395c]"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 text-[10px] text-[#64748b]">
            <RefreshCw className="w-3 h-3 shrink-0" />
            <span>
              Filters run against your <strong>uploaded Stock + Sales files</strong>.
              Example: Branch <code className="bg-white/80 px-1 rounded">GUL</code> + Cts{' '}
              <code className="bg-white/80 px-1 rounded">0.02</code> →{' '}
              <code className="bg-white/80 px-1 rounded">0.20</code> regenerates all
              distribution / allocation / movement reports for that slice.
            </span>
          </div>
        </div>

        {/* Active filter chips */}
        {hasActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#b8bca8]">
            <span className="text-[10px] font-bold text-[#475569]">Active:</span>
            {filters.branchId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#17395c] text-white text-[10px] font-bold">
                Branch: {filters.branchId}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, branchId: '' })}
                  className="hover:text-rose-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(filters.ctsFrom || filters.ctsTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-700 text-white text-[10px] font-bold">
                Cts: {filters.ctsFrom || '…'} → {filters.ctsTo || '…'}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, ctsFrom: '', ctsTo: '' })}
                  className="hover:text-rose-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.mainCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-white text-[10px] font-bold">
                Cat: {filters.mainCategory}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, mainCategory: '' })}
                  className="hover:text-rose-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filters.subCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-600 text-white text-[10px] font-bold">
                Sub: {filters.subCategory}
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, subCategory: '' })}
                  className="hover:text-rose-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
