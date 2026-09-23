import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  FolderLock,
  Layers,
  CheckCircle2,
  Sparkles,
  Database,
  ArrowRight,
  ShieldAlert,
  Flame,
  ArrowRightLeft,
  Store,
  RefreshCw,
  Code
} from 'lucide-react';
import { RedistributionReport, RawInventoryRecord, ActionAlert } from '../types';
import { parseUniversalInventoryData, ParsedDataResult, mergeDualStockAndSoldData } from '../utils/universalParser';

interface OperationsDataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: RedistributionReport;
  rawRecords: RawInventoryRecord[];
  onImportRecords: (records: RawInventoryRecord[], period: string, specialMonths?: import('../types').SpecialMonth[]) => void;
  onNavigateTab: (tab: string) => void;
}

export const OperationsDataDrawer: React.FC<OperationsDataDrawerProps> = ({
  isOpen,
  onClose,
  report,
  rawRecords,
  onImportRecords,
  onNavigateTab
}) => {
  const [activeSubFolder, setActiveSubFolder] = useState<'alerts' | 'html_import' | 'raw_table'>('alerts');
  const [soldHtmlText, setSoldHtmlText] = useState('');
  const [stockHtmlText, setStockHtmlText] = useState('');
  const [singleHtmlText, setSingleHtmlText] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const enrichForReports = (records: RawInventoryRecord[]): RawInventoryRecord[] =>
    records.map((r) => {
      const sold = Number(r.soldQty) || 0;
      return {
        ...r,
        sales3M: r.sales3M !== undefined ? r.sales3M : Math.max(0, Math.round(sold * 0.4)),
        sales6M: r.sales6M !== undefined ? r.sales6M : Math.max(0, Math.round(sold * 0.7)),
        sales1Y: r.sales1Y !== undefined ? r.sales1Y : sold,
        sales2Y: r.sales2Y !== undefined ? r.sales2Y : Math.max(0, Math.round(sold * 1.8)),
        ageDays: r.ageDays !== undefined ? r.ageDays : (r.currentStock > 0 && sold === 0 ? 310 : 65)
      };
    });

  const handleApplySingleHtml = () => {
    if (!singleHtmlText.trim()) {
      setStatusMsg({ type: 'error', text: 'Please paste or upload HTML report content first.' });
      return;
    }
    try {
      const res = parseUniversalInventoryData(singleHtmlText);
      if (res.records.length > 0) {
        onImportRecords(enrichForReports(res.records), report.period);
        setStatusMsg({
          type: 'success',
          text: `Successfully ingested ${res.records.length} records (${res.summary.totalSold} sold, ${res.summary.totalStock} stock)! All reports refreshed.`
        });
      } else {
        setStatusMsg({ type: 'error', text: 'No inventory table cells could be parsed from the provided HTML.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Parsing failed.' });
    }
  };

  const handleApplyDualHtml = () => {
    if (!soldHtmlText.trim() && !stockHtmlText.trim()) {
      setStatusMsg({ type: 'error', text: 'Please provide either Sold HTML or Stock HTML (or both).' });
      return;
    }

    try {
      let mergedRecords: RawInventoryRecord[] = [];

      if (soldHtmlText.includes(',') || stockHtmlText.includes(',')) {
        const dualResult = mergeDualStockAndSoldData(stockHtmlText, soldHtmlText);
        mergedRecords = dualResult.records;
      } else {
        const soldParsed = soldHtmlText.trim() ? parseUniversalInventoryData(soldHtmlText) : { records: [] };
        const stockParsed = stockHtmlText.trim() ? parseUniversalInventoryData(stockHtmlText) : { records: [] };

        const recordMap: Record<string, { branch: string; weight: string; soldQty: number; currentStock: number }> = {};

        soldParsed.records.forEach(r => {
          const key = `${r.branch}__${r.weight}`;
          if (!recordMap[key]) recordMap[key] = { branch: r.branch, weight: r.weight, soldQty: 0, currentStock: 0 };
          recordMap[key].soldQty += r.soldQty;
        });

        stockParsed.records.forEach(r => {
          const key = `${r.branch}__${r.weight}`;
          if (!recordMap[key]) recordMap[key] = { branch: r.branch, weight: r.weight, soldQty: 0, currentStock: 0 };
          recordMap[key].currentStock += r.currentStock;
        });

        mergedRecords = Object.values(recordMap).map((m, idx) => ({
          id: `html-ora-${idx}-${Date.now()}`,
          ...m
        }));
      }

      if (mergedRecords.length > 0) {
        onImportRecords(enrichForReports(mergedRecords), report.period);
        setStatusMsg({
          type: 'success',
          text: `Combined ${mergedRecords.length} branch/weight records successfully! All reports & analysis refreshed.`
        });
      } else {
        setStatusMsg({ type: 'error', text: 'No valid data could be combined.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error processing data.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Operations &amp; Data Center
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Folder Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Actionable inventory alerts, HTML data ingestion, and raw record storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subfolder Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveSubFolder('alerts')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubFolder === 'alerts'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Actionable Alerts ({report.actionAlerts.length})</span>
          </button>

          <button
            onClick={() => setActiveSubFolder('html_import')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubFolder === 'html_import'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4 text-cyan-400" />
            <span>HTML Data Ingestion</span>
          </button>

          <button
            onClick={() => setActiveSubFolder('raw_table')}
            className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeSubFolder === 'raw_table'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4 text-slate-400" />
            <span>Raw Records ({rawRecords.length})</span>
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center justify-between ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/80'
              }`}
            >
              <span>{statusMsg.text}</span>
              <button
                onClick={() => setStatusMsg(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
          )}

          {/* SUBFOLDER 1: ACTIONABLE ALERTS */}
          {activeSubFolder === 'alerts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Real-time Operational Directives
                </span>
                <span className="text-xs text-cyan-400 font-mono">
                  {report.actionAlerts.length} issues identified
                </span>
              </div>

              {report.actionAlerts.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  All branch inventories are operating within optimal parameters.
                </div>
              ) : (
                report.actionAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border transition-all ${
                      alert.priority === 'URGENT'
                        ? 'bg-rose-950/30 border-rose-900/60'
                        : alert.priority === 'WARNING'
                        ? 'bg-amber-950/30 border-amber-900/60'
                        : 'bg-blue-950/30 border-blue-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              alert.priority === 'URGENT'
                                ? 'bg-rose-900/80 text-rose-200'
                                : alert.priority === 'WARNING'
                                ? 'bg-amber-900/80 text-amber-200'
                                : 'bg-blue-900/80 text-blue-200'
                            }`}
                          >
                            {alert.priority}
                          </span>
                          <h4 className="text-xs font-bold text-white">{alert.title}</h4>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{alert.description}</p>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          if (alert.type === 'PROCUREMENT_REQUIRED' || alert.type === 'CRITICAL_SHORTAGE') {
                            onNavigateTab('refill_demand');
                          } else if (alert.type === 'TRANSFER_OPPORTUNITY') {
                            onNavigateTab('movement_summary');
                          } else {
                            onNavigateTab('branches');
                          }
                        }}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                      >
                        <span>{alert.actionText || 'Act'}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SUBFOLDER 2: HTML DATA INGESTION */}
          {activeSubFolder === 'html_import' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Oracle Reports HTML Compatibility</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The parser accepts legacy Oracle Reports item-wise Sold and Stock HTML structures and maps the detected item / SKU / variant across all branch stores.
                </p>
              </div>

              {/* Dual File Option */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Option A: Dual HTML Input (Sold HTML + Stock HTML)
                </h4>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 block font-medium">
                    1. Sold Report (HTML):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste Sold report HTML here..."
                    value={soldHtmlText}
                    onChange={e => setSoldHtmlText(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-300 block font-medium">
                    2. Stock Report (HTML):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste Stock report HTML here..."
                    value={stockHtmlText}
                    onChange={e => setStockHtmlText(e.target.value)}
                    className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  onClick={handleApplyDualHtml}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Combine &amp; Ingest Both HTML Reports
                </button>
              </div>

              {/* Single File Option */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Option B: Single HTML Report
                </h4>
                <textarea
                  rows={4}
                  placeholder="Paste single HTML table content here..."
                  value={singleHtmlText}
                  onChange={e => setSingleHtmlText(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleApplySingleHtml}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Ingest Single HTML
                </button>
              </div>
            </div>
          )}

          {/* SUBFOLDER 3: RAW RECORDS TABLE */}
          {activeSubFolder === 'raw_table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Stored Records: {rawRecords.length} rows</span>
                <span className="font-mono">
                  Sold: {rawRecords.reduce((a, b) => a + b.soldQty, 0)} | Stock: {rawRecords.reduce((a, b) => a + b.currentStock, 0)}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 sticky top-0 text-[11px] text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3">SL</th>
                      <th className="py-2 px-3">Branch</th>
                      <th className="py-2 px-3">Weight</th>
                      <th className="py-2 px-3 text-center">Sold</th>
                      <th className="py-2 px-3 text-center">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {rawRecords.map((r, idx) => (
                      <tr key={r.id} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-3 text-white font-sans">{r.branch}</td>
                        <td className="py-1.5 px-3 text-cyan-400">{r.weight} ct</td>
                        <td className="py-1.5 px-3 text-center">{r.soldQty}</td>
                        <td className="py-1.5 px-3 text-center">{r.currentStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
