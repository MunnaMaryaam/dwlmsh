import React, { useState } from 'react';
import { Search, Circle as HelpCircle, MessageSquare, User, Star, Clock, Hop as Home, ChevronDown, Download, Settings, LogOut, Sparkles, Layers, FolderLock, PackagePlus, ArrowRightLeft, FileSpreadsheet, Building2, Gem, Plus } from 'lucide-react';
import { AuthUser, SalesTimeframe, AllocationMode } from '../types';
import { DiamondWorldLogo } from './DiamondWorldLogo';

interface NetSuiteTopHeaderProps {
  activeView: string;
  activeReport: string;
  onNavigateView: (view: any, report?: any) => void;
  selectedTimeframe: SalesTimeframe;
  onTimeframeChange: (tf: SalesTimeframe) => void;
  allocationMode: AllocationMode;
  onAllocationModeChange: (mode: AllocationMode) => void;
  period: string;
  onPeriodChange: (val: string) => void;
  onOpenDailyUpload: () => void;
  onExportExcel: () => void;
  onToggleAICopilot: () => void;
  isAiDrawerOpen: boolean;
  onOpenOperations: () => void;
  onOpenUserManagement: () => void;
  onOpenSettings: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onQuickSearchBranch?: (branch: string) => void;
}

export const NetSuiteTopHeader: React.FC<NetSuiteTopHeaderProps> = ({
  activeView,
  activeReport,
  onNavigateView,
  selectedTimeframe,
  onTimeframeChange,
  allocationMode,
  onAllocationModeChange,
  period,
  onPeriodChange,
  onOpenDailyUpload,
  onExportExcel,
  onToggleAICopilot,
  isAiDrawerOpen,
  onOpenOperations,
  onOpenUserManagement,
  onOpenSettings,
  currentUser,
  onLogout,
  onQuickSearchBranch
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isReportsDropdownOpen, setIsReportsDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);

  const getBreadcrumbTitle = () => {
    if (activeView === 'dashboard' || activeView === 'menu') return 'Operations Cockpit';
    if (activeView === 'option_allocation') return 'Stock Distribution > Item-Wise Allocation & Redistribution';
    if (activeView === 'movement_aging') return 'Stock Intelligence > Movement, Velocity & Aging Analysis';
    if (activeView === 'consignment_shipment') return 'Requisitions > Consignment & Factory Orders Planner';
    if (activeView === 'reports') {
      const names: Record<string, string> = {
        refill_demand: 'Reports > Showroom Refill Demand Requisitions',
        excel_sheet: 'Reports > Master Inventory & Sales Matrix (Excel)',
        movement_summary: 'Reports > Movement Dispatch & Rebalancing Matrix',
        branches: 'Reports > Showroom Outlet Balances & Ratios',
        weights: 'Reports > Item / SKU Velocity Analysis',
        demand_booster: 'Reports > Demand Opportunity & Growth Booster'
      };
      return names[activeReport] || 'Reports';
    }
    return 'Operations Cockpit';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onQuickSearchBranch) {
      onQuickSearchBranch(searchQuery.trim().toUpperCase());
      setSearchQuery('');
    }
  };

  return (
    <header className="w-full bg-[#e8eaed] border-b border-[#c5c9d0] sticky top-0 z-40 shadow-xs font-sans">
      
      {/* 1. TOP BRAND & SEARCH BAR: Diamond World LTD Stock Operations ERP */}
      <div className="bg-white border-b border-[#e2e8f0] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
        
        {/* Left: Diamond World LTD Brand Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateView('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
            title="Go to Stock Operations Cockpit"
          >
            {/* Diamond World brand mark (matches login portal) */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#fdfbf6] to-[#e7e2d6] border border-[#d4af37]/50 flex items-center justify-center p-2 shadow-md shadow-[#d4af37]/15 overflow-hidden group-hover:border-[#d4af37] transition-colors">
              <img
                src="/diamond-world-logo-cutout.png"
                alt="Diamond World"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg text-[#0f2b48] tracking-tight leading-none font-mono">
                  DIAMOND WORLD LTD
                </span>
                <span className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0a0a0c] font-bold text-[9px] px-1.5 py-0.5 rounded tracking-wider uppercase font-mono shadow-sm">
                  STOCK ERP
                </span>
              </div>
              <span className="text-[11px] text-[#64748b] font-medium leading-tight mt-1">
                the art of beauty · Stock Operations
              </span>
            </div>
          </button>
        </div>

        {/* Center: Global Search Bar for Branches, Weights, and Outlets */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-2 hidden sm:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#94a3b8]">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Showroom, Item / SKU / Variant, Requisitions..."
              className="w-full pl-8 pr-4 py-1.5 rounded bg-[#f1f5f9] hover:bg-[#e2e8f0]/80 focus:bg-white text-xs text-[#1e293b] placeholder-[#94a3b8] border border-[#cbd5e1] focus:outline-none focus:border-[#17395c] focus:ring-1 focus:ring-[#17395c]/20 transition-all font-medium"
            />
          </div>
        </form>

        {/* Right: Quick Action Items (Daily Upload, Feedback, User Profile) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Daily Upload Quick Button — gold accent like brand */}
          <button
            onClick={onOpenDailyUpload}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-[#d4af37] to-[#b8860b] hover:from-[#e0c04a] hover:to-[#c9a227] text-[#0a0a0c] font-bold text-xs shadow-sm shadow-[#d4af37]/30 transition-colors cursor-pointer"
            title="Upload Daily Sales & Closing Stock Excel Files"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Daily Intake</span>
          </button>

          {/* AI Copilot Button */}
          <button
            onClick={onToggleAICopilot}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded border transition-colors cursor-pointer text-xs font-semibold ${
              isAiDrawerOpen
                ? 'bg-[#17395c] text-white border-[#d4af37]/50'
                : 'bg-white text-[#475569] border-[#cbd5e1] hover:text-[#17395c] hover:border-[#d4af37]/40'
            }`}
            title="Open Diamond World AI Analyst"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>AI Copilot</span>
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded hover:bg-[#f1f5f9] cursor-pointer transition-colors text-left"
              title="User Account Menu"
            >
              <div className="w-7 h-7 rounded-full bg-[#17395c] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'SH'}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#1e293b] leading-none">
                  {currentUser?.name || 'MD Shahadat Hossen'}
                </span>
                <span className="text-[9px] text-[#64748b] leading-tight mt-0.5">
                  DWL • {currentUser?.isOwner ? 'SYSTEM OWNER' : 'AUTHORIZED USER'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#64748b]" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1 w-60 bg-white rounded shadow-lg border border-[#cbd5e1] py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
                  <p className="font-bold text-[#1e293b]">{currentUser?.name || 'MD Shahadat Hossen'}</p>
                  <p className="text-[10px] text-[#64748b]">{currentUser?.username || 'shahadat'}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#e2e8f0] text-[#17395c] text-[9px] font-bold rounded">
                    Role: {currentUser?.role || 'Operations Administrator'}
                  </span>
                </div>
                {currentUser?.isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenUserManagement();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center gap-2 text-[#334155] cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#64748b]" />
                      <span>Manage Users &amp; Permissions</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSettings();
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center gap-2 text-[#334155] cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#64748b]" />
                      <span>ERP Display &amp; Number Preferences</span>
                    </button>
                  </>
                )}
                <div className="border-t border-[#e2e8f0] my-1" />
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-rose-50 text-rose-700 flex items-center gap-2 font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. NAV RIBBON — dark navy + gold (matches login showcase) */}
      <div className="bg-[#0a0a0c] text-[#c9d0d8] px-2 sm:px-5 flex items-center justify-between text-[11px] font-semibold overflow-x-auto shadow-sm select-none border-t border-[#d4af37]/20">
        
        <div className="flex items-center gap-0.5 min-w-max">
          
          {/* Cockpit Home */}
          <button
            onClick={() => onNavigateView('dashboard')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 transition-colors cursor-pointer ${
              activeView === 'dashboard' || activeView === 'menu'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : 'text-[#c9d0d8] hover:text-white'
            }`}
            title="Stock Operations Dashboard"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Cockpit</span>
          </button>

          {/* Item Allocation Matrix */}
          <button
            onClick={() => onNavigateView('option_allocation')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'option_allocation'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Item Allocation Matrix</span>
          </button>

          {/* Movement & Aging Analysis */}
          <button
            onClick={() => onNavigateView('movement_aging')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'movement_aging'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span>Movement &amp; Aging</span>
          </button>

          {/* Refill Demand Requisitions */}
          <button
            onClick={() => onNavigateView('reports', 'refill_demand')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'reports' && activeReport === 'refill_demand'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5 text-amber-300" />
            <span>Refill Demand</span>
          </button>

          {/* Consignment Factory Orders */}
          <button
            onClick={() => onNavigateView('consignment_shipment')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'consignment_shipment'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consignment Orders</span>
          </button>

          {/* Showroom Outlets */}
          <button
            onClick={() => onNavigateView('reports', 'branches')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'reports' && activeReport === 'branches'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            <span>Showrooms</span>
          </button>

          {/* Item Velocity */}
          <button
            onClick={() => onNavigateView('reports', 'weights')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'reports' && activeReport === 'weights'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-indigo-300" />
            <span>Item Velocity</span>
          </button>

          {/* Master Excel Matrix */}
          <button
            onClick={() => onNavigateView('reports', 'excel_sheet')}
            className={`px-3 py-2 flex items-center gap-1.5 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer ${
              activeView === 'reports' && activeReport === 'excel_sheet'
                ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]'
                : ''
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Master Excel Matrix</span>
          </button>

          {/* Reports Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsReportsDropdownOpen(!isReportsDropdownOpen)}
              className={`px-2.5 py-2 hover:bg-[#17395c]/80 hover:text-white transition-colors flex items-center gap-1 cursor-pointer ${
                activeView === 'reports' ? 'bg-[#17395c] text-white font-bold border-b-2 border-[#d4af37]' : ''
              }`}
            >
              <span>All Reports</span>
              <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {isReportsDropdownOpen && (
              <div
                className="absolute left-0 mt-0.5 w-64 bg-white text-[#1e293b] rounded shadow-xl border border-[#cbd5e1] py-1 z-50 text-xs font-normal"
                onMouseLeave={() => setIsReportsDropdownOpen(false)}
              >
                <div className="px-3 py-1 font-bold text-[#64748b] text-[10px] uppercase tracking-wider border-b border-[#e2e8f0]">
                  Diamond Stock Reports
                </div>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'refill_demand');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'refill_demand' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>Refill Demand Requisitions</span>
                  <span className="text-[10px] text-amber-600 font-bold">Priority</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'excel_sheet');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'excel_sheet' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>Master Inventory &amp; Sales Matrix</span>
                  <span className="text-[10px] text-emerald-600 font-bold">Excel Grid</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'movement_summary');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'movement_summary' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>Movement Dispatch &amp; Rebalancing</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'branches');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'branches' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>Showroom Balances &amp; Balance Ratios</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'weights');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'weights' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>Item / SKU Velocity Analysis</span>
                </button>
                <button
                  onClick={() => {
                    setIsReportsDropdownOpen(false);
                    onNavigateView('reports', 'demand_booster');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#f1f5f9] flex items-center justify-between ${
                    activeReport === 'demand_booster' ? 'bg-[#e2e8f0] font-bold text-[#17395c]' : ''
                  }`}
                >
                  <span>High-Demand Opportunity Booster</span>
                </button>
              </div>
            )}
          </div>

          {/* Operations Vault */}
          <button
            onClick={onOpenOperations}
            className="px-2.5 py-2 hover:bg-[#17395c]/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <FolderLock className="w-3.5 h-3.5 text-slate-300" />
            <span>Vault</span>
          </button>

        </div>

        {/* Right side live status indicator */}
        <div className="hidden lg:flex items-center gap-2 text-[10px] text-[#94a3b8] py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
          <span className="font-mono text-[#d4af37]">LIVE ERP</span>
          <span>•</span>
          <span>{period}</span>
        </div>

      </div>

      {/* 3. SUB-HEADER BAR: Breadcrumb, Timeframe Switcher, and Quick Export */}
      <div className="bg-[#f8fafc] border-b border-[#e2e8f0] px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-extrabold text-[#1e293b] tracking-tight">
            {getBreadcrumbTitle()}
          </h2>
        </div>

        {/* Right: Timeframe Switch & Export */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          
          {/* 3 Distribution Analysis Mode Buttons — switches full-app report */}
          <div className="flex items-center gap-1 text-[#64748b] text-[11px]">
            <span className="hidden sm:inline font-semibold">Distribution:</span>
          </div>
          <div className="flex items-center rounded-lg bg-[#e2e8f0] p-0.5 text-[11px] font-bold shadow-2xs">
            {([
              { id: 'contribution' as AllocationMode, label: '① Contribution', tip: 'Total stock (DWL+all) × sales share' },
              { id: 'baseline' as AllocationMode, label: '② 3M Baseline', tip: 'Excel 3-month backup + scale + 20% bonus' },
              { id: 'hybrid' as AllocationMode, label: '③ Hybrid', tip: 'max(contribution, baseline) then compress' }
            ]).map((m) => (
              <button
                key={m.id}
                type="button"
                title={m.tip}
                onClick={() => {
                  onAllocationModeChange(m.id);
                  // Jump to allocation matrix so user sees the live redistribution
                  if (activeView !== 'option_allocation') {
                    onNavigateView('option_allocation');
                  }
                }}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-all whitespace-nowrap ${
                  allocationMode === m.id
                    ? 'bg-[#17395c] text-white shadow-2xs ring-1 ring-[#d4af37]/50'
                    : 'text-[#475569] hover:text-[#1e293b] hover:bg-white/60'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <span className="text-[#cbd5e1] hidden sm:inline">•</span>

          <div className="flex items-center gap-1 text-[#64748b] text-[11px]">
            <span>Sales:</span>
          </div>

          {/* Timeframe Switcher */}
          <div className="flex items-center rounded bg-[#e2e8f0] p-0.5 text-[11px] font-bold">
            {(['1Y', '9M', '6M', '3M', '1M'] as SalesTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-0.5 rounded cursor-pointer transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-[#17395c] text-white shadow-2xs ring-1 ring-[#d4af37]/40'
                    : 'text-[#475569] hover:text-[#1e293b]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <span className="text-[#cbd5e1] hidden sm:inline">•</span>

          {/* Export Excel Button */}
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#17395c] hover:bg-[#0f2b48] text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer border border-[#d4af37]/30"
            title="Export Excel Matrix"
          >
            <Download className="w-3 h-3" />
            <span>Export Excel</span>
          </button>

        </div>

      </div>

    </header>
  );
};
