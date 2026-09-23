import React, { useState, useEffect } from 'react';
import { X, CloudUpload as UploadCloud, FileSpreadsheet, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, Sparkles, Layers, ArrowRight, Database, RefreshCw, FileText, Calendar, Check, Plus, Trash2, PartyPopper } from 'lucide-react';
import { RawInventoryRecord, SpecialMonth, SpecialMonthType } from '../types';
import {
  mergeDualStockAndSoldData,
  ParsedDataResult
} from '../utils/universalParser';
import { saveDailySnapshot } from '../utils/dailyStorageEngine';

interface DailyDualFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRecords: (records: RawInventoryRecord[], period: string, specialMonths?: SpecialMonth[]) => void;
  currentPeriod?: string;
}

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SPECIAL_TYPE_OPTIONS: SpecialMonthType[] = ['Festival', 'Exhibition', 'Promotion', 'Other'];

// Generic jewelry template for testing the parser. Production data is supplied by upload.
export const SAMPLE_SOLDOUT_MATRIX_TEXT = `Category,Branch,Nosepin-A,Nosepin-B,Earring-A,Earring-B,Finger-Ring-A,Locket-A,Total
Demo Jewelry,Branch-01,2,1,0,1,2,0,6
,Branch-02,1,0,2,0,1,1,5
,Branch-03,0,1,1,0,0,2,4
,Total,3,2,3,1,3,3,15`;

export const SAMPLE_STOCK_MATRIX_TEXT = `Category,Branch,Nosepin-A,Nosepin-B,Earring-A,Earring-B,Finger-Ring-A,Locket-A,Total
Demo Jewelry,Branch-01,5,2,1,3,4,1,16
,Branch-02,1,1,5,2,1,4,14
,Branch-03,0,3,2,1,2,5,13
,Central Warehouse,20,10,15,10,12,18,85
,Total,26,16,23,16,19,28,128`;

function formatDateDDMMYYYY(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function toInputDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fromInputDate(s: string): Date {
  const d = new Date(s + 'T12:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

/** Enrich dual-upload records with multi-period sales estimates so all report timeframes work. */
function enrichRecordsWithPeriodSales(
  records: RawInventoryRecord[],
  periodDays: number
): RawInventoryRecord[] {
  return records.map((r) => {
    const sold = Number(r.soldQty) || 0;
    // Scale estimates so the uploaded soldQty maps to the selected period window
    const factor3m = periodDays > 0 ? Math.min(1, 90 / periodDays) : 0.4;
    const factor6m = periodDays > 0 ? Math.min(1, 180 / periodDays) : 0.7;
    const factor1y = periodDays > 0 ? Math.min(1, 365 / periodDays) : 1;
    const factor2y = periodDays > 0 ? Math.min(2, 730 / periodDays) : 1.8;
    return {
      ...r,
      sales3M: r.sales3M !== undefined ? r.sales3M : Math.max(0, Math.round(sold * factor3m)),
      sales6M: r.sales6M !== undefined ? r.sales6M : Math.max(0, Math.round(sold * factor6m)),
      sales1Y: r.sales1Y !== undefined ? r.sales1Y : Math.max(0, Math.round(sold * factor1y)),
      sales2Y: r.sales2Y !== undefined ? r.sales2Y : Math.max(0, Math.round(sold * factor2y)),
      ageDays: r.ageDays !== undefined ? r.ageDays : (r.currentStock > 0 && sold === 0 ? 310 : 65)
    };
  });
}

export const DailyDualFileUploadModal: React.FC<DailyDualFileUploadModalProps> = ({
  isOpen,
  onClose,
  onImportRecords,
  currentPeriod = 'Last 30 Days'
}) => {
  const [stockFileName, setStockFileName] = useState('');
  const [stockContent, setStockContent] = useState<string | ArrayBuffer>('');
  const [stockMode, setStockMode] = useState<'upload' | 'paste'>('upload');

  const [soldFileName, setSoldFileName] = useState('');
  const [soldContent, setSoldContent] = useState<string | ArrayBuffer>('');
  const [soldMode, setSoldMode] = useState<'upload' | 'paste'>('upload');

  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const [quickPeriod, setQuickPeriod] = useState<string>('1m');
  const [fromDate, setFromDate] = useState(toInputDate(defaultFrom));
  const [toDate, setToDate] = useState(toInputDate(today));
  const [period, setPeriod] = useState(
    `${formatDateDDMMYYYY(defaultFrom)} to ${formatDateDDMMYYYY(today)}`
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedDataResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Special / Festival / Exhibition / Promotion months
  const [specialMonths, setSpecialMonths] = useState<SpecialMonth[]>([]);
  const [newMonthLabel, setNewMonthLabel] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newSpecialType, setNewSpecialType] = useState<SpecialMonthType>('Festival');
  const [newMonthYear, setNewMonthYear] = useState(String(new Date().getFullYear()));

  const handleAddSpecialMonth = () => {
    if (!newMonthLabel.trim() || !newEventName.trim()) return;
    const label = newMonthYear
      ? `${newMonthLabel.trim()} ${newMonthYear.trim()}`
      : newMonthLabel.trim();
    setSpecialMonths((prev) => [
      ...prev,
      {
        id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        monthLabel: label,
        eventName: newEventName.trim(),
        type: newSpecialType
      }
    ]);
    setNewEventName('');
    setNewMonthLabel('');
  };

  const handleRemoveSpecialMonth = (id: string) => {
    setSpecialMonths((prev) => prev.filter((m) => m.id !== id));
  };

  // Sync period label when modal opens with currentPeriod
  useEffect(() => {
    if (isOpen && currentPeriod) {
      // Keep existing custom range; only seed if still default-ish
      if (!period || period.includes('Last 30') || period.includes('Daily Update')) {
        const f = new Date(today);
        f.setDate(f.getDate() - 30);
        setFromDate(toInputDate(f));
        setToDate(toInputDate(today));
        setPeriod(`${formatDateDDMMYYYY(f)} to ${formatDateDDMMYYYY(today)}`);
        setQuickPeriod('1m');
      }
    }
  }, [isOpen]);

  const handlePeriodQuickChange = (preset: string) => {
    setQuickPeriod(preset);
    const end = new Date();
    const start = new Date();
    if (preset === '7d') start.setDate(end.getDate() - 7);
    else if (preset === '15d') start.setDate(end.getDate() - 15);
    else if (preset === '1m') start.setMonth(end.getMonth() - 1);
    else if (preset === '3m') start.setMonth(end.getMonth() - 3);
    else if (preset === '6m') start.setMonth(end.getMonth() - 6);
    else if (preset === '9m') start.setMonth(end.getMonth() - 9);
    else if (preset === 'ytd') {
      start.setMonth(0);
      start.setDate(1);
    } else if (preset === 'custom') {
      // keep current from/to; user will edit
      setPeriod(`${formatDateDDMMYYYY(fromInputDate(fromDate))} to ${formatDateDDMMYYYY(fromInputDate(toDate))}`);
      return;
    }
    setFromDate(toInputDate(start));
    setToDate(toInputDate(end));
    setPeriod(`${formatDateDDMMYYYY(start)} to ${formatDateDDMMYYYY(end)}`);
  };

  const handleFromToChange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setQuickPeriod('custom');
    setPeriod(
      `${formatDateDDMMYYYY(fromInputDate(from))} to ${formatDateDDMMYYYY(fromInputDate(to))}`
    );
  };

  const getPeriodDays = (): number => {
    const f = fromInputDate(fromDate).getTime();
    const t = fromInputDate(toDate).getTime();
    return Math.max(1, Math.round(Math.abs(t - f) / (1000 * 60 * 60 * 24)));
  };

  if (!isOpen) return null;

  const handleProcessMerge = (stock: string | ArrayBuffer, sold: string | ArrayBuffer) => {
    if (!stock || !sold) {
      setParsedResult(null);
      return;
    }
    try {
      setIsProcessing(true);
      setErrorMsg('');
      const result = mergeDualStockAndSoldData(stock, sold, stockFileName || 'stock.csv', soldFileName || 'sold.csv');
      if (result.records.length === 0) {
        setErrorMsg('Could not detect valid branch and item records. Please verify the upload contains branch and item / SKU identifiers.');
        setParsedResult(null);
      } else {
        setParsedResult(result);
      }
    } catch (err: any) {
      setErrorMsg(`Error parsing files: ${err.message || 'Check file formatting'}`);
      setParsedResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStockFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStockFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        setStockContent(buf);
        if (soldContent) {
          handleProcessMerge(buf, soldContent);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        setStockContent(txt);
        if (soldContent) {
          handleProcessMerge(txt, soldContent);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleSoldFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSoldFileName(file.name);
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const reader = new FileReader();
    if (isExcel) {
      reader.onload = (ev) => {
        const buf = ev.target?.result as ArrayBuffer;
        setSoldContent(buf);
        if (stockContent) {
          handleProcessMerge(stockContent, buf);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        setSoldContent(txt);
        if (stockContent) {
          handleProcessMerge(stockContent, txt);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    setStockFileName('Current_Stock_Report.csv');
    setStockContent(SAMPLE_STOCK_MATRIX_TEXT);
    setStockMode('paste');

    setSoldFileName('Soldout_Sales_Report.csv');
    setSoldContent(SAMPLE_SOLDOUT_MATRIX_TEXT);
    setSoldMode('paste');

    handleProcessMerge(SAMPLE_STOCK_MATRIX_TEXT, SAMPLE_SOLDOUT_MATRIX_TEXT);
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.records.length === 0) {
      setErrorMsg('Please upload both Stock and Sold Out files before applying.');
      return;
    }
    const periodDays = getPeriodDays();
    const enriched = enrichRecordsWithPeriodSales(parsedResult.records, periodDays);
    // Automatically save daily snapshot into the daily movement tracking engine
    saveDailySnapshot(
      enriched,
      undefined,
      `Daily Ingestion (${period}) - ${parsedResult.summary.totalStock} Pcs`
    );
    onImportRecords(
      enriched,
      period,
      specialMonths.length > 0 ? specialMonths : undefined
    );
    onClose();
  };

  return (
    <div
      id="daily-dual-upload-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Daily 2-File Upload (Current Stock & Sold Out Files)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Dual Ingestion
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Upload your daily Current Stock and Sold Out files (Excel, CSV, or paste text). The system will automatically map the matrices and calculate redistribution.
              </p>
            </div>
          </div>
          <button
            id="close-daily-upload-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Quick Helper Banner */}
          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Format Support:</strong> Both files share the same branch rows and product/carat columns. The engine merges stock and sales to compute optimal redistribution.
              </span>
            </div>
            <button
              id="btn-load-sample-solitaire"
              type="button"
              onClick={handleLoadSample}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Load Sample Data (Solitaire Earring)
            </button>
          </div>

          {/* Two Side-by-side or stacked File Dropzones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Current Stock */}
            <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                      📦 Current Stock File
                      <span className="text-xs text-blue-400 font-normal">(Stock Data)</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStockMode('upload')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      stockMode === 'upload' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    File
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMode('paste')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      stockMode === 'paste' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste
                  </button>
                </div>
              </div>

              {stockMode === 'upload' ? (
                <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-850/50 hover:bg-slate-800/40 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleStockFileUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-6 h-6 text-blue-400" />
                  <div className="text-center">
                    <span className="text-xs font-semibold text-slate-200">
                      {stockFileName || 'Select or drop Current Stock file'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">.xlsx, .xls, .csv, .txt</p>
                  </div>
                  {stockFileName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Check className="w-3 h-3" /> File Selected
                    </span>
                  )}
                </label>
              ) : (
                <textarea
                  rows={4}
                  value={typeof stockContent === 'string' ? stockContent : ''}
                  onChange={(e) => {
                    setStockContent(e.target.value);
                    if (soldContent) handleProcessMerge(e.target.value, soldContent);
                  }}
                  placeholder="Paste Current Stock CSV / matrix text here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              )}
            </div>

            {/* Box 2: Sold Out */}
            <div className="border border-slate-800 bg-slate-900/90 rounded-xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                      🛒 Sold Out / Sales File
                      <span className="text-xs text-amber-400 font-normal">(Sales Demand)</span>
                    </h3>
                  </div>
                </div>
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSoldMode('upload')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      soldMode === 'upload' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    File
                  </button>
                  <button
                    type="button"
                    onClick={() => setSoldMode('paste')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      soldMode === 'paste' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste
                  </button>
                </div>
              </div>

              {soldMode === 'upload' ? (
                <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-850/50 hover:bg-slate-800/40 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleSoldFileUpload}
                    className="hidden"
                  />
                  <UploadCloud className="w-6 h-6 text-amber-400" />
                  <div className="text-center">
                    <span className="text-xs font-semibold text-slate-200">
                      {soldFileName || 'Select or drop Sold Out file'}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">.xlsx, .xls, .csv, .txt</p>
                  </div>
                  {soldFileName && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <Check className="w-3 h-3" /> File Selected
                    </span>
                  )}
                </label>
              ) : (
                <textarea
                  rows={4}
                  value={typeof soldContent === 'string' ? soldContent : ''}
                  onChange={(e) => {
                    setSoldContent(e.target.value);
                    if (stockContent) handleProcessMerge(stockContent, e.target.value);
                  }}
                  placeholder="Paste Sold Out CSV / matrix text here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              )}
            </div>
          </div>

          {/* Custom Duration / Period Selector */}
          <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Select Sales Duration / Period
              </label>
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                {[
                  { id: '7d', label: '7 Days' },
                  { id: '15d', label: '15 Days' },
                  { id: '1m', label: '1 Month' },
                  { id: '3m', label: '3 Months' },
                  { id: '6m', label: '6 Months' },
                  { id: '9m', label: '9 Months' },
                  { id: 'ytd', label: 'YTD' },
                  { id: 'custom', label: 'Custom' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePeriodQuickChange(p.id)}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      quickPeriod === p.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => handleFromToChange(e.target.value, toDate)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleFromToChange(fromDate, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 shrink-0">Period Label:</span>
              <input
                type="text"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  setQuickPeriod('custom');
                }}
                placeholder="e.g. 01-03-2026 to 19-09-2026"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              This period is stamped on all reports, Excel exports, KPIs, and analysis. Choose a preset or custom dates.
            </p>
          </div>

          {/* Special / Festival / Exhibition / Promotion months */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <PartyPopper className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-100">
                  Special Months (Festival / Exhibition / Promotion)
                </h3>
                <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                  Months with Festival, Exhibition, or Promotion often have unusually high sales.
                  They are <strong className="text-amber-100">not treated as normal average months</strong>.
                  Select the month and enter the event name, then Add.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-3">
                <label className="text-[10px] text-amber-200/80 block mb-1">Month</label>
                <select
                  value={newMonthLabel}
                  onChange={(e) => setNewMonthLabel(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="">Select month…</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] text-amber-200/80 block mb-1">Year</label>
                <input
                  type="text"
                  value={newMonthYear}
                  onChange={(e) => setNewMonthYear(e.target.value)}
                  placeholder="2026"
                  className="w-full text-xs bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-[10px] text-amber-200/80 block mb-1">Festival / Event name</label>
                <input
                  type="text"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  placeholder="e.g. Eid-ul-Fitr, Durga Puja Expo"
                  className="w-full text-xs bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] text-amber-200/80 block mb-1">Type</label>
                <select
                  value={newSpecialType}
                  onChange={(e) => setNewSpecialType(e.target.value as SpecialMonthType)}
                  className="w-full text-xs bg-slate-950 border border-amber-500/40 rounded-lg px-2 py-2 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {SPECIAL_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddSpecialMonth}
                  disabled={!newMonthLabel.trim() || !newEventName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>

            {specialMonths.length > 0 && (
              <ul className="space-y-1.5 mt-1">
                {specialMonths.map((sm) => (
                  <li
                    key={sm.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 border border-amber-500/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-amber-100">{sm.monthLabel}</span>
                      <span className="text-slate-500 mx-1.5">·</span>
                      <span className="text-xs text-white">{sm.eventName}</span>
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30">
                        {sm.type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecialMonth(sm.id)}
                      className="shrink-0 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {specialMonths.length === 0 && (
              <p className="text-[11px] text-slate-500 italic">
                No special months added — all months count toward the normal average.
              </p>
            )}
          </div>

          {/* Error Message if Any */}
          {errorMsg && (
            <div className="bg-rose-950/50 border border-rose-800 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Ingestion Summary & Preview */}
          {parsedResult && (
            <div className="border border-slate-800 rounded-xl bg-slate-850/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Combined Ingestion Summary (Verified Data)
                </h4>
                <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready to Ingest
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Branches</span>
                  <span className="text-base font-bold text-slate-100">
                    {parsedResult.summary.branchesFound}
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Carats / Products</span>
                  <span className="text-base font-bold text-slate-100">
                    {parsedResult.summary.weightsFound}
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Current Stock</span>
                  <span className="text-base font-bold text-blue-400">
                    {parsedResult.summary.totalStock} pcs
                  </span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Sold Quantity</span>
                  <span className="text-base font-bold text-amber-400">
                    {parsedResult.summary.totalSold} pcs
                  </span>
                </div>
              </div>

              {specialMonths.length > 0 && (
                <div className="text-amber-200/90 text-[11px] bg-amber-950/40 border border-amber-500/20 rounded-lg px-3 py-2">
                  Special months (normalized out of average):{' '}
                  {specialMonths.map((s) => `${s.monthLabel} — ${s.eventName}`).join('; ')}
                </div>
              )}

              {/* Sample 5 Records Preview */}
              <div className="mt-2">
                <span className="text-[11px] text-slate-400 block mb-1.5">Sample Merged Records:</span>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-1.5 border-b border-slate-800 font-semibold">Branch</th>
                        <th className="px-3 py-1.5 border-b border-slate-800 font-semibold">Carat / Item</th>
                        <th className="px-3 py-1.5 border-b border-slate-800 font-semibold text-right">Current Stock</th>
                        <th className="px-3 py-1.5 border-b border-slate-800 font-semibold text-right">Sold Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300 font-mono text-[11px]">
                      {parsedResult.records.slice(0, 6).map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="px-3 py-1 font-sans font-medium text-slate-200">{rec.branch}</td>
                          <td className="px-3 py-1">{rec.weight}</td>
                          <td className="px-3 py-1 text-right text-blue-400 font-semibold">{rec.currentStock}</td>
                          <td className="px-3 py-1 text-right text-amber-400 font-semibold">{rec.soldQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {(!parsedResult || parsedResult.records.length === 0) && (
              <button
                type="button"
                onClick={() => {
                  if (stockContent && soldContent) {
                    handleProcessMerge(stockContent, soldContent);
                  } else {
                    setErrorMsg('Please select or paste both files to process.');
                  }
                }}
                disabled={!stockContent || !soldContent}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 disabled:opacity-50 transition-colors"
              >
                Verify & Merge Files
              </button>
            )}

            <button
              id="btn-apply-daily-upload"
              type="button"
              onClick={handleApply}
              disabled={!parsedResult || parsedResult.records.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply & Calculate Redistribution
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
