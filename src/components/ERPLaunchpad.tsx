import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ArrowRightLeft,
  Clock,
  PackagePlus,
  UploadCloud,
  Users,
  Settings,
  Search,
  ChevronRight,
  ShieldCheck,
  Building2,
  Database,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Layers,
  CheckCircle2,
  Gem,
  Files,
  List,
  Grid
} from 'lucide-react';
import { AuthUser, RedistributionReport } from '../types';
import { DiamondWorldLogo } from './DiamondWorldLogo';

interface ERPLaunchpadProps {
  currentUser: AuthUser;
  totalRecords: number;
  period: string;
  report: RedistributionReport;
  onNavigate: (view: 'dashboard' | 'option_allocation' | 'movement_aging' | 'consignment_shipment' | 'reports', subReport?: string) => void;
  onOpenDailyUpload: () => void;
  onOpenOperations: () => void;
  onOpenUserManagement: () => void;
  onOpenSettings: () => void;
  onOpenAICopilot: () => void;
}

export const ERPLaunchpad: React.FC<ERPLaunchpadProps> = ({
  currentUser,
  totalRecords,
  period,
  report,
  onNavigate,
  onOpenDailyUpload,
  onOpenOperations,
  onOpenUserManagement,
  onOpenSettings,
  onOpenAICopilot
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'analytics' | 'inventory' | 'system'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // ERP Modules definition with comprehensive details
  const erpModules = [
    {
      id: 'dashboard',
      category: 'analytics',
      title: 'Dashboard (Executive Cockpit)',
      description: 'Comprehensive network health overview, stockout alert matrix, high-velocity branches, and core enterprise KPIs.',
      icon: LayoutDashboard,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
      badge: 'Executive Level',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
      stats: `${report.actionAlerts.length} Action Alerts • ${report.branchSummaries.length} Branches Active`,
      action: () => onNavigate('dashboard'),
      actionLabel: 'Open Dashboard'
    },
    {
      id: 'reports',
      category: 'analytics',
      title: 'Report (Analytical Reports Hub)',
      description: 'Full suite of intelligence reports: Refill Demand, Master Excel Matrix, Movement & Aging, Branch Metrics, and Weight Velocity.',
      icon: Files,
      iconColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800',
      badge: '6 Reports Suite',
      badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
      stats: 'Refill Demand • Excel Sheet • Movement Summary • Branch Table • Weight Matrix',
      action: () => onNavigate('reports'),
      actionLabel: 'Open Reports',
      subOptions: [
        { label: 'Refill Demand Report', key: 'refill_demand' },
        { label: 'Master Excel Sheet View', key: 'excel_sheet' },
        { label: 'Movement & Aging Summary', key: 'movement_summary' },
        { label: 'Branch Performance Table', key: 'branches' },
        { label: 'Weight Velocity Matrix', key: 'weights' },
        { label: 'Demand Booster Analysis', key: 'demand_booster' }
      ]
    },
    {
      id: 'option_allocation',
      category: 'inventory',
      title: 'Stock Allocation (All Items / Variants)',
      description: 'Algorithm-driven inter-branch stock allocation for any product, jewelry item, SKU or variant, with transfer schedules and surplus-to-deficit routing.',
      icon: Gem,
      iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      badge: 'Universal Item Allocation Matrix',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      stats: `${report.totalCurrentStock.toLocaleString()} Units Distributed Across Network`,
      action: () => onNavigate('option_allocation'),
      actionLabel: 'Open Allocation'
    },
    {
      id: 'movement_aging',
      category: 'inventory',
      title: 'Movement & Aging (Inventory Flow)',
      description: 'Stagnant inventory tracking, 90+ days idle stock flags, transit turnaround velocity, and slow-moving branch alerts.',
      icon: Clock,
      iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
      badge: 'Inventory Velocity',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
      stats: `${report.topOverstockedBranches.length} High Surplus Branches Detected`,
      action: () => onNavigate('movement_aging'),
      actionLabel: 'Open Movement & Aging'
    },
    {
      id: 'consignment_shipment',
      category: 'inventory',
      title: 'Consignment Requisitions (Supplier Orders)',
      description: 'Procurement demand forecasting, supplier order suggestions, high-demand item replenishment, and purchase requisition export.',
      icon: PackagePlus,
      iconColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
      badge: 'Order Automation',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
      stats: `${report.consignmentRecommendations?.length || 0} Recommended Procurement Items`,
      action: () => onNavigate('consignment_shipment'),
      actionLabel: 'Open Consignment'
    },
    {
      id: 'operations_upload',
      category: 'inventory',
      title: 'Daily Data Ingestion & Operations',
      description: 'Upload daily POS sales & closing stock Excel files, run automated dataset reconciliation, and audit active inventory records.',
      icon: UploadCloud,
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
      badge: 'Daily Sync',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
      stats: `${totalRecords.toLocaleString()} Active Stock Rows In-Memory`,
      action: () => onOpenDailyUpload(),
      actionLabel: 'Launch Upload Modal'
    },
    {
      id: 'user_management',
      category: 'system',
      title: 'User Management & Access Control (RBAC)',
      description: 'Role-based access permissions, add or modify authorized enterprise users (Super Admin, Executive, Analyst, Branch Manager).',
      icon: Users,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
      badge: 'RBAC Security',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
      stats: `Current User: ${currentUser.name} (${currentUser.role})`,
      action: () => onOpenUserManagement(),
      actionLabel: 'Manage Users'
    },
    {
      id: 'system_settings',
      category: 'system',
      title: 'System Preferences & Settings',
      description: 'Color schemes (Light, Midnight, Emerald, Dark Slate), default timeframe filters, threshold parameters, and cache management.',
      icon: Settings,
      iconColor: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 ',
      badge: 'Configuration',
      badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
      stats: `Period: ${period} • Live Engine V4.2`,
      action: () => onOpenSettings(),
      actionLabel: 'Open Settings'
    }
  ];

  const filteredModules = erpModules.filter(mod => {
    const matchesCategory = selectedCategory === 'all' || mod.category === selectedCategory;
    const matchesSearch =
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.stats.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2 sm:py-4">
      
      {/* 1. ERP Enterprise Workspace Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xl shadow-slate-900/5 relative overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-teal-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200  flex items-center justify-center p-1.5 shadow-md shrink-0">
              <DiamondWorldLogo tone="black" className="w-full h-full text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  DWL Analytical Cockpit
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                  ERP Portal
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Welcome, <strong className="text-slate-800 dark:text-slate-200">{currentUser.name}</strong> • Enterprise Stock Intelligence &amp; Allocation Hub
              </p>
            </div>
          </div>

          {/* Quick System Status Pills */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200  text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-teal-500" />
              <span><strong>{totalRecords.toLocaleString()}</strong> Rows Loaded</span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200  text-xs flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="capitalize">Role: <strong>{currentUser.role}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ERP Navigation & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Modules ({erpModules.length})
          </button>
          <button
            onClick={() => setSelectedCategory('analytics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'analytics'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Analytics &amp; Reports
          </button>
          <button
            onClick={() => setSelectedCategory('inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'inventory'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Inventory &amp; Allocation
          </button>
          <button
            onClick={() => setSelectedCategory('system')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === 'system'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            System &amp; Security
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search ERP modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200  text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 ">
            <button
              onClick={() => setViewMode('list')}
              title="List View (ERP Standard)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. ERP MODULES LIST / GRID */}
      {viewMode === 'list' ? (
        /* ERP LIST-WISE VIEW (Requested format: "Report, Dashboard egula list wise kore diben") */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-md overflow-hidden">
          {filteredModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <div
                key={module.id}
                onClick={module.action}
                className="p-4 sm:p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
              >
                <div className="flex items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon Tile */}
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${module.iconColor} group-hover:scale-105 transition-transform`}>
                      <IconComponent className="w-6 h-6" />
                    </div>

                    {/* Content Details */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {module.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${module.badgeColor}`}>
                          {module.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {module.description}
                      </p>

                      <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        <span>{module.stats}</span>
                      </div>

                      {/* Sub-options for Reports if available */}
                      {module.subOptions && (
                        <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                          {module.subOptions.map((sub) => (
                            <button
                              key={sub.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('reports', sub.key);
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200  transition-all cursor-pointer font-medium"
                            >
                              {sub.label} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Button */}
                  <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 bg-slate-100 dark:bg-slate-800 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/50 px-3.5 py-2 rounded-xl border border-slate-200  transition-all shrink-0">
                    <span>{module.actionLabel}</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ERP GRID VIEW (Alternate view) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <div
                key={module.id}
                onClick={module.action}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 hover:border-teal-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${module.iconColor} group-hover:scale-105 transition-transform shadow-xs`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${module.badgeColor}`}>
                      {module.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors mb-1.5">
                    {module.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                    {module.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[200px]">
                    {module.stats}
                  </span>
                  <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    {module.actionLabel} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Quick Help / AI Copilot Strip */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              AI Intelligent Inventory Copilot
            </h4>
            <p className="text-xs text-slate-400">
              Need automated redistribution recommendations or stock anomaly insights?
            </p>
          </div>
        </div>

        <button
          onClick={onOpenAICopilot}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
        >
          Ask AI Copilot
        </button>
      </div>

    </div>
  );
};
