import React from 'react';
import {
  Menu,
  Download,
  UploadCloud,
  Calendar,
  Sparkles,
  RefreshCw,
  FolderLock
} from 'lucide-react';
import { SalesTimeframe } from '../types';

interface DashboardTopHeaderProps {
  title: string;
  subtitle: string;
  period: string;
  onPeriodChange: (val: string) => void;
  selectedTimeframe: SalesTimeframe;
  onTimeframeChange: (tf: SalesTimeframe) => void;
  onOpenDailyUpload: () => void;
  onExportExcel: () => void;
  onToggleAICopilot: () => void;
  isAiDrawerOpen: boolean;
  onOpenMobileMenu: () => void;
  onResetData?: () => void;
}

export const DashboardTopHeader: React.FC<DashboardTopHeaderProps> = ({
  title,
  subtitle,
  period,
  onPeriodChange,
  selectedTimeframe,
  onTimeframeChange,
  onOpenDailyUpload,
  onExportExcel,
  onToggleAICopilot,
  isAiDrawerOpen,
  onOpenMobileMenu,
  onResetData
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-3.5 sm:py-4 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        
        {/* Left Side: Mobile Menu Button + Title & Subtitle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{subtitle}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Status Badge, Timeframe Selectors, Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap lg:justify-end">
          
          {/* LIVE SYSTEM STATUS PILL (Matching reference image exactly) */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-wide shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span className="font-mono text-[11px] uppercase tracking-wider">LIVE SYSTEM</span>
          </div>

          {/* Timeframe / Reporting Period Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-0.5 text-xs shadow-2xs">
            {(['1Y', '9M', '6M', '3M', '1M'] as SalesTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  selectedTimeframe === tf
                    ? 'bg-emerald-700 dark:bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Claims Intake / Daily Upload Action */}
          <button
            id="btn-topbar-daily-upload"
            onClick={onOpenDailyUpload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Upload Daily Sales & Closing Stock Files"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Daily Upload</span>
          </button>

          {/* Export PDF / Excel Button (Green primary button matching reference image) */}
          <button
            id="btn-topbar-export-excel"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Export full inventory redistribution matrix to Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* AI Copilot Button */}
          <button
            id="btn-topbar-ai-copilot"
            onClick={onToggleAICopilot}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
              isAiDrawerOpen
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 border-slate-200 dark:border-slate-700'
            }`}
            title="Toggle Gemini AI Copilot Drawer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">AI Copilot</span>
          </button>
        </div>

      </div>
    </header>
  );
};
