import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Gem,
  Clock,
  PackagePlus,
  Files,
  FileSpreadsheet,
  ArrowRightLeft,
  Flame,
  Building2,
  TrendingUp,
  FolderLock,
  Users,
  Settings,
  Sparkles,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { AuthUser } from '../types';
import { DiamondWorldLogo } from './DiamondWorldLogo';

interface SidebarNavigationProps {
  activeView: 'dashboard' | 'option_allocation' | 'movement_aging' | 'consignment_shipment' | 'reports';
  onSelectView: (view: 'dashboard' | 'option_allocation' | 'movement_aging' | 'consignment_shipment' | 'reports') => void;
  activeReport: 'refill_demand' | 'excel_sheet' | 'movement_summary' | 'branches' | 'weights' | 'demand_booster';
  onSelectReport: (report: 'refill_demand' | 'excel_sheet' | 'movement_summary' | 'branches' | 'weights' | 'demand_booster') => void;
  onOpenDailyUpload: () => void;
  onOpenOperations: () => void;
  onOpenUserManagement: () => void;
  onOpenSettings: () => void;
  onToggleAICopilot: () => void;
  isAiDrawerOpen: boolean;
  alertsCount: number;
  requisitionsCount: number;
  currentUser: AuthUser | null;
  onLogout: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  activeView,
  onSelectView,
  activeReport,
  onSelectReport,
  onOpenDailyUpload,
  onOpenOperations,
  onOpenUserManagement,
  onOpenSettings,
  onToggleAICopilot,
  isAiDrawerOpen,
  alertsCount,
  requisitionsCount,
  currentUser,
  onLogout,
  isMobileOpen,
  onCloseMobile
}) => {
  const [isReportsExpanded, setIsReportsExpanded] = React.useState(true);

  // Helper for user initials (e.g. "Marcus Vance" -> "MV", or "Admin" -> "DW")
  const getUserInitials = (name?: string) => {
    if (!name) return 'DW';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleNavClick = (view: 'dashboard' | 'option_allocation' | 'movement_aging' | 'consignment_shipment' | 'reports', subReport?: typeof activeReport) => {
    onSelectView(view);
    if (subReport) {
      onSelectReport(subReport);
    }
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Persistent Left Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#071a14] border-r border-[#0f3126] text-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Identity Header */}
        <div className="p-5 border-b border-[#0f3126] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md shadow-emerald-950/60 shrink-0">
              <DiamondWorldLogo tone="black" className="w-full h-full text-[#071a14]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-white tracking-tight">
                  DIAMOND WORLD
                </span>
              </div>
              <p className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase font-mono">
                JEWELLERY ERP OPS
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-950/60"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Options Menu */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-transparent">
          
          {/* SECTION 1: OPERATIONS CONSOLE (Exact style from reference screenshot) */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-emerald-400/90 uppercase font-mono">
                OPERATIONS CONSOLE
              </span>
            </div>

            <nav className="space-y-1">
              {/* Overview Scorecard (Executive Dashboard) */}
              <button
                id="sidebar-nav-overview"
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeView === 'dashboard'
                    ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      activeView === 'dashboard'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-emerald-800/80'
                    }`}
                  />
                  <span>Overview Scorecard</span>
                </div>
                {alertsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                    {alertsCount}
                  </span>
                )}
              </button>

              {/* Claims / Daily Intake Console */}
              <button
                id="sidebar-nav-daily-intake"
                onClick={() => {
                  onOpenDailyUpload();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#0c241c] transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800/80 group-hover:bg-teal-400 shrink-0 transition-colors" />
                  <span>Claims Intake Console</span>
                </div>
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>

              {/* Universal Item Allocation Matrix */}
              <button
                id="sidebar-nav-stock-allocation"
                onClick={() => handleNavClick('option_allocation')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeView === 'option_allocation'
                    ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      activeView === 'option_allocation'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-emerald-800/80'
                    }`}
                  />
                  <span>Stock Allocation</span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800/60">
                  Item Allocation
                </span>
              </button>

              {/* Movement & Aging Analysis */}
              <button
                id="sidebar-nav-movement-aging"
                onClick={() => handleNavClick('movement_aging')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeView === 'movement_aging'
                    ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      activeView === 'movement_aging'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-emerald-800/80'
                    }`}
                  />
                  <span>Movement &amp; Aging</span>
                </div>
              </button>

              {/* Consignment Requisitions */}
              <button
                id="sidebar-nav-consignment"
                onClick={() => handleNavClick('consignment_shipment')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  activeView === 'consignment_shipment'
                    ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                      activeView === 'consignment_shipment'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : 'bg-emerald-800/80'
                    }`}
                  />
                  <span>Consignment Requisitions</span>
                </div>
                {requisitionsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                    {requisitionsCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* SECTION 2: ANALYTICAL SUITE & REPORTS */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-emerald-400/90 uppercase font-mono">
                ANALYTICAL REPORTS
              </span>
              <button
                onClick={() => setIsReportsExpanded(!isReportsExpanded)}
                className="text-emerald-500 hover:text-emerald-300 p-0.5 rounded cursor-pointer"
                title={isReportsExpanded ? 'Collapse' : 'Expand'}
              >
                {isReportsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isReportsExpanded && (
              <nav className="space-y-1">
                {/* 1. Refill Demand Report */}
                <button
                  id="sidebar-nav-refill-demand"
                  onClick={() => handleNavClick('reports', 'refill_demand')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'refill_demand'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'refill_demand'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Refill Demand Report</span>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                </button>

                {/* 2. Master Excel Sheet */}
                <button
                  id="sidebar-nav-master-excel"
                  onClick={() => handleNavClick('reports', 'excel_sheet')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'excel_sheet'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'excel_sheet'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Master Excel Matrix</span>
                  </div>
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                </button>

                {/* 3. Movement Summary */}
                <button
                  id="sidebar-nav-movement-summary"
                  onClick={() => handleNavClick('reports', 'movement_summary')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'movement_summary'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'movement_summary'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Movement Summary</span>
                  </div>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                </button>

                {/* 4. Branch Balances */}
                <button
                  id="sidebar-nav-branch-balances"
                  onClick={() => handleNavClick('reports', 'branches')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'branches'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'branches'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Branch Balances</span>
                  </div>
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                {/* 5. Item / SKU Velocity */}
                <button
                  id="sidebar-nav-weight-velocity"
                  onClick={() => handleNavClick('reports', 'weights')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'weights'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'weights'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Item / SKU Velocity</span>
                  </div>
                  <Gem className="w-3.5 h-3.5 text-teal-400" />
                </button>

                {/* 6. Demand Booster */}
                <button
                  id="sidebar-nav-demand-booster"
                  onClick={() => handleNavClick('reports', 'demand_booster')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    activeView === 'reports' && activeReport === 'demand_booster'
                      ? 'bg-[#103529] text-white shadow-sm border border-emerald-600/40'
                      : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${
                        activeView === 'reports' && activeReport === 'demand_booster'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                          : 'bg-emerald-800/80'
                      }`}
                    />
                    <span>Demand Booster</span>
                  </div>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </nav>
            )}
          </div>

          {/* SECTION 3: ENTERPRISE CONTROLS & COPILOT */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-emerald-400/90 uppercase font-mono">
                ENTERPRISE CONTROLS
              </span>
            </div>

            <nav className="space-y-1">
              {/* AI Copilot Drawer */}
              <button
                id="sidebar-nav-ai-copilot"
                onClick={() => {
                  onToggleAICopilot();
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isAiDrawerOpen
                    ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-600/50'
                    : 'text-slate-300 hover:text-white hover:bg-[#0c241c]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isAiDrawerOpen ? 'bg-emerald-400' : 'bg-emerald-800/80'}`} />
                  <span>AI Inventory Copilot</span>
                </div>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              {/* Operations & Raw Data Vault */}
              <button
                id="sidebar-nav-operations-vault"
                onClick={() => {
                  onOpenOperations();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#0c241c] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800/80 shrink-0" />
                  <span>Operations Vault</span>
                </div>
                <FolderLock className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              {/* User Management */}
              <button
                id="sidebar-nav-user-management"
                onClick={() => {
                  onOpenUserManagement();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#0c241c] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800/80 shrink-0" />
                  <span>User &amp; Access Roles</span>
                </div>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              {/* Settings */}
              <button
                id="sidebar-nav-settings"
                onClick={() => {
                  onOpenSettings();
                  onCloseMobile();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#0c241c] transition-all cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-800/80 shrink-0" />
                  <span>System Settings</span>
                </div>
                <Settings className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </nav>
          </div>
        </div>

        {/* User Profile Card at Sidebar Footer (Directly matching Marcus Vance profile card in image) */}
        <div className="p-3.5 border-t border-[#0f3126] bg-[#05140f]">
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#092219] border border-[#0f3629]">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Circular Avatar with Initials */}
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-emerald-950/80 border border-emerald-400/40">
                {getUserInitials(currentUser?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Marcus Vance'}
                </p>
                <p className="text-[10px] text-emerald-400/90 font-medium truncate">
                  {currentUser?.role ? `${currentUser.role.toUpperCase()} Operations` : 'VP Stock Operations'}
                </p>
              </div>
            </div>

            {/* Logout Action */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
