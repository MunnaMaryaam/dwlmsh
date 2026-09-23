import React from 'react';
import {
  Sparkles,
  FolderLock,
  Download,
  RotateCcw,
  Calendar,
  Gem,
  ShieldAlert,
  Smartphone,
  UploadCloud,
  Home,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { AuthUser } from '../types';
import { DiamondWorldLogo } from './DiamondWorldLogo';

interface NavbarProps {
  period: string;
  onPeriodChange: (val: string) => void;
  onOpenOperations: () => void;
  onOpenDailyUpload: () => void;
  onGoHome?: () => void;
  alertsCount: number;
  onResetData: () => void;
  onExportCSV: () => void;
  onToggleAICopilot: () => void;
  isAiDrawerOpen: boolean;
  totalRecordsCount: number;
  isMobileCompact?: boolean;
  onToggleMobileCompact?: () => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenUserManagement?: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  period,
  onPeriodChange,
  onOpenOperations,
  onOpenDailyUpload,
  onGoHome,
  alertsCount,
  onResetData,
  onExportCSV,
  onToggleAICopilot,
  isAiDrawerOpen,
  totalRecordsCount,
  isMobileCompact,
  onToggleMobileCompact,
  currentUser,
  onLogout,
  onOpenUserManagement,
  onOpenSettings
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand & Identity (Odoo / SAP / Sage Professional ERP Style) */}
          <div
            onClick={onGoHome}
            className={`flex items-center gap-3 ${onGoHome ? 'cursor-pointer select-none group' : ''}`}
            title="DWL Analytical Cockpit"
          >
            <div className="w-14 h-14 rounded-xl bg-white border border-slate-700/80 flex items-center justify-center shadow-md shadow-black/40 shrink-0 group-hover:border-teal-400 transition-colors p-1">
              <DiamondWorldLogo tone="black" className="w-full h-full text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white group-hover:text-teal-300 transition-colors">
                  DWL Analytical Cockpit
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700 font-mono tracking-wide">
                  Enterprise
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Enterprise ERP Action Bar) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* ERP Menu Launchpad Button */}
            <button
              id="btn-navbar-erp-menu"
              onClick={onGoHome}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 hover:border-teal-500/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Return to ERP Modules Directory"
            >
              <LayoutGrid className="w-4 h-4 text-teal-400" />
              <span>ERP Menu</span>
            </button>

            {/* Daily Dual Upload Button (Primary Action) */}
            <button
              id="btn-navbar-daily-upload"
              onClick={onOpenDailyUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-700 hover:bg-teal-600 text-white shadow-sm border border-teal-600/50 transition-all active:scale-95 cursor-pointer"
              title="Upload Daily Files: Current Stock + Sold Out Files"
            >
              <UploadCloud className="w-4 h-4 text-teal-200" />
              <span>Ingest Daily Data</span>
            </button>

            {/* Operations & Alerts */}
            <button
              id="btn-open-operations"
              onClick={onOpenOperations}
              className="relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Open Operations & Data Center (Alerts, Importer, Raw Records)"
            >
              <FolderLock className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Operations</span>
              {alertsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {alertsCount}
                </span>
              )}
            </button>

            {/* Export Excel */}
            <button
              id="btn-export-report"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Export complete redistribution report as Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Export</span>
            </button>

            {/* AI Advisor / Copilot */}
            <button
              id="btn-toggle-ai-copilot"
              onClick={onToggleAICopilot}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer ${
                isAiDrawerOpen
                  ? 'bg-teal-600 text-white ring-2 ring-teal-400/50'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600'
              }`}
              title="Analytics AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Settings */}
            {onOpenSettings && (
              <button
                id="btn-open-settings"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Application Settings & Preferences"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden xl:inline">Settings</span>
              </button>
            )}

            {/* User Access Controls */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-800">
                {/* User Info & Manage Users Button */}
                <button
                  id="btn-user-management"
                  onClick={onOpenUserManagement}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500/40 transition-all text-xs"
                  title="Manage Authorized Users & Permissions"
                >
                  <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${currentUser.avatarColor || 'from-cyan-500 to-blue-600'} flex items-center justify-center text-[10px] font-bold text-white uppercase`}>
                    {currentUser.username.charAt(0)}
                  </div>
                  <span className="font-medium hidden md:inline truncate max-w-[90px]">{currentUser.name}</span>
                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : currentUser.role === 'manager'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {currentUser.role}
                  </span>
                  <Users className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {/* Logout Button */}
                {onLogout && (
                  <button
                    id="btn-logout"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                    title="Sign Out of DWL Analytics"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
