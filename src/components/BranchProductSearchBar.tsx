import React, { useState, useRef, useEffect } from 'react';
import { RedistributionReport, BranchSummary, WeightSummary } from '../types';
import {
  Building2,
  Gem,
  Search,
  X,
  ArrowRight,
  TrendingUp,
  Package,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Store,
  MapPin
} from 'lucide-react';

interface BranchProductSearchBarProps {
  report: RedistributionReport;
  onOpenBranchReport: (branch: string) => void;
  onOpenProductReport: (weight: string) => void;
}

export const BranchProductSearchBar: React.FC<BranchProductSearchBarProps> = ({
  report,
  onOpenBranchReport,
  onOpenProductReport
}) => {
  const [branchQuery, setBranchQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);

  const branchRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setIsBranchOpen(false);
      }
      if (productRef.current && !productRef.current.contains(e.target as Node)) {
        setIsProductOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered branches
  const filteredBranches = report.branchSummaries.filter((b) => {
    if (!branchQuery.trim()) return true;
    return b.branch.toLowerCase().includes(branchQuery.toLowerCase());
  });

  // Filtered products (weights)
  const filteredProducts = report.weightSummaries.filter((w) => {
    if (!productQuery.trim()) return true;
    return w.weight.toLowerCase().includes(productQuery.toLowerCase());
  });

  const itemLabel = report.categoryConfig?.itemLabel || 'Carat / Item';
  const itemUnit = report.categoryConfig?.itemUnit || 'units';

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl backdrop-blur-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        
        {/* 1. BRANCH SEARCH BAR */}
        <div ref={branchRef} className="relative">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Branch Search</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {report.branchSummaries.length} Stores Available
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Branch (e.g., B01, CTG, Sylhet)..."
              value={branchQuery}
              onChange={(e) => {
                setBranchQuery(e.target.value);
                setIsBranchOpen(true);
              }}
              onFocus={() => setIsBranchOpen(true)}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus:border-cyan-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
            />
            {branchQuery && (
              <button
                onClick={() => {
                  setBranchQuery('');
                }}
                className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Popular Branches Chips */}
          <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Quick Select:</span>
            {report.branchSummaries.slice(0, 5).map((b) => (
              <button
                key={b.branch}
                onClick={() => {
                  onOpenBranchReport(b.branch);
                  setIsBranchOpen(false);
                }}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700 hover:border-cyan-700 transition-colors whitespace-nowrap"
              >
                {b.branch}
              </button>
            ))}
          </div>

          {/* Branch Dropdown / Suggestions */}
          {isBranchOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 bg-slate-950/80 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Select a branch to view full report:</span>
                <span className="font-mono text-cyan-400">{filteredBranches.length} found</span>
              </div>

              {filteredBranches.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No branch found matching "{branchQuery}".
                </div>
              ) : (
                filteredBranches.map((b) => (
                  <div
                    key={b.branch}
                    onClick={() => {
                      onOpenBranchReport(b.branch);
                      setIsBranchOpen(false);
                    }}
                    className="p-3 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 group-hover:bg-cyan-900/60 text-slate-300 group-hover:text-cyan-300 flex items-center justify-center font-mono font-bold text-xs">
                        {b.branch.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                            Branch {b.branch}
                          </span>
                          {b.totalMoveIn > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              +{b.totalMoveIn} IN
                            </span>
                          )}
                          {b.totalMoveOut > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              -{b.totalMoveOut} OUT
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Sold: <strong className="text-slate-200">{b.totalSold}</strong> • Stock: <strong className="text-slate-200">{b.totalCurrentStock}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        b.status === 'SHORTAGE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : b.status === 'OVERSTOCKED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {b.status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. PRODUCT / CARAT SEARCH BAR */}
        <div ref={productRef} className="relative">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
              <Gem className="w-3.5 h-3.5 text-blue-400" />
              <span>Product / Carat Search</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Find where items are located
            </span>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-blue-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Product / Carat (e.g., 0.24, 0.29, 1.00)..."
              value={productQuery}
              onChange={(e) => {
                setProductQuery(e.target.value);
                setIsProductOpen(true);
              }}
              onFocus={() => setIsProductOpen(true)}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-950/90 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            />
            {productQuery && (
              <button
                onClick={() => {
                  setProductQuery('');
                }}
                className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Popular Products Chips */}
          <div className="flex items-center gap-1.5 mt-2 px-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Popular Sizes:</span>
            {report.weightSummaries.slice(0, 5).map((w) => (
              <button
                key={w.weight}
                onClick={() => {
                  onOpenProductReport(w.weight);
                  setIsProductOpen(false);
                }}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800/80 hover:bg-blue-950 hover:text-blue-300 text-slate-300 border border-slate-700 hover:border-blue-700 transition-colors whitespace-nowrap"
              >
                {w.weight} {itemUnit === 'ct' ? 'ct' : ''}
              </button>
            ))}
          </div>

          {/* Product Dropdown / Suggestions */}
          {isProductOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-slate-800">
              <div className="p-2 bg-slate-950/80 text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                <span>Select a product to view enterprise store availability:</span>
                <span className="font-mono text-blue-400">{filteredProducts.length} sizes</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No product found matching "{productQuery}".
                </div>
              ) : (
                filteredProducts.map((w) => {
                  // Count how many branches have this product in stock
                  let branchesWithStockCount = 0;
                  report.matrix.branches.forEach((b) => {
                    const cell = report.matrix.cells[b]?.[w.weight];
                    if (cell && cell.stock > 0) branchesWithStockCount++;
                  });

                  return (
                    <div
                      key={w.weight}
                      onClick={() => {
                        onOpenProductReport(w.weight);
                        setIsProductOpen(false);
                      }}
                      className="p-3 hover:bg-blue-950/40 cursor-pointer flex items-center justify-between gap-3 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 group-hover:bg-blue-900/60 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                          <Gem className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-blue-300">
                              {w.weight} {itemUnit === 'ct' ? 'Carat Diamond' : itemLabel}
                            </span>
                            {w.unmetShortage > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                Buy +{w.unmetShortage}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            In Stock at <strong className="text-emerald-400">{branchesWithStockCount} branches</strong> ({w.currentStock} {itemUnit}) • Total Sold: <strong className="text-slate-200">{w.soldQty}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {w.velocityCategory}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
