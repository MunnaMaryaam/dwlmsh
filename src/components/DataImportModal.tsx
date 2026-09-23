import React, { useState, useRef } from 'react';
import { X, CloudUpload as UploadCloud, FileSpreadsheet, Code as Code2, FileCode, Calendar, Layers, CircleCheck as CheckCircle, CircleAlert as AlertCircle, RefreshCw, Sparkles, Database, ArrowRight, Plus, Trash2, PartyPopper } from 'lucide-react';
import { parseUniversalInventoryData, ParsedDataResult } from '../utils/universalParser';
import { RawInventoryRecord, SpecialMonth, SpecialMonthType } from '../types';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRecords: (records: RawInventoryRecord[], period: string, specialMonths?: SpecialMonth[]) => void;
  currentRecordsCount: number;
  currentPeriod: string;
}

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SPECIAL_TYPE_OPTIONS: SpecialMonthType[] = ['Festival', 'Exhibition', 'Promotion', 'Other'];

const SAMPLE_CSV = `Branch,Weight,Sold Qty,Current Stock
Bashundhara,0.24,1,1
Online,0.24,1,0
Gulshan,0.24,2,1
Chittagong - #01,0.24,1,0
Gulshan,1.00,1,1
Online,1.00,1,0
Baily-Road,1.00,1,0
Bashundhara,0.29,1,0
Baily-Road,0.29,1,0
Gulshan,0.29,1,1
Dhanmondi,0.34,1,1
Uttara,0.34,1,0
Gulshan,1.80,1,0
Mirpur,0.60,0,2
Dhanmondi,0.60,0,1
Rajshahi,0.60,0,1
Noakhali,0.60,0,1
Savar,0.29,0,1
Gulshan,1.08,0,1
Mirpur,1.08,0,1
Uttara,1.04,0,1
Bashundhara,1.04,0,1`;

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <item branch="Bashundhara" weight="0.24" sold="1" stock="1" />
  <item branch="Online" weight="0.24" sold="1" stock="0" />
  <item branch="Gulshan" weight="0.24" sold="2" stock="1" />
  <item branch="Chittagong - #01" weight="0.24" sold="1" stock="0" />
  <item branch="Gulshan" weight="1.00" sold="1" stock="1" />
  <item branch="Online" weight="1.00" sold="1" stock="0" />
  <item branch="Baily-Road" weight="1.00" sold="1" stock="0" />
  <item branch="Bashundhara" weight="0.29" sold="1" stock="0" />
  <item branch="Mirpur" weight="0.60" sold="0" stock="2" />
  <item branch="Dhanmondi" weight="0.60" sold="0" stock="1" />
</inventory>`;

const SAMPLE_HTML = `<table border="1">
  <tr><th>Branch</th><th>Weight (Carat)</th><th>Sold Qty</th><th>Current Stock</th></tr>
  <tr><td>Bashundhara</td><td>0.24</td><td>1</td><td>1</td></tr>
  <tr><td>Online</td><td>0.24</td><td>1</td><td>0</td></tr>
  <tr><td>Gulshan</td><td>0.24</td><td>2</td><td>1</td></tr>
  <tr><td>Gulshan</td><td>1.00</td><td>1</td><td>1</td></tr>
  <tr><td>Online</td><td>1.00</td><td>1</td><td>0</td></tr>
  <tr><td>Mirpur</td><td>0.60</td><td>0</td><td>2</td></tr>
</table>`;

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onImportRecords,
  currentRecordsCount,
  currentPeriod
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'dual_sheet'>('upload');
  const [selectedFormat, setSelectedFormat] = useState<'AUTO' | 'EXCEL' | 'XML' | 'HTML' | 'CSV'>('AUTO');
  
  // Period duration state
  const formatD = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };
  const toInputDate = (d: Date) => d.toISOString().slice(0, 10);
  const fromInputDate = (s: string) => {
    const d = new Date(s + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const initToday = new Date();
  const initFrom = new Date(initToday);
  initFrom.setMonth(initFrom.getMonth() - 3);

  const [periodText, setPeriodText] = useState(
    currentPeriod || `${formatD(initFrom)} to ${formatD(initToday)}`
  );
  const [quickPeriod, setQuickPeriod] = useState<string>('3m');
  const [fromDate, setFromDate] = useState(toInputDate(initFrom));
  const [toDate, setToDate] = useState(toInputDate(initToday));

  // Input states
  const [inputText, setInputText] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedDataResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Dual file upload states (Soldout file + Current stock file)
  const [soldFileText, setSoldFileText] = useState('');
  const [stockFileText, setStockFileText] = useState('');
  const [soldFileName, setSoldFileName] = useState('');
  const [stockFileName, setStockFileName] = useState('');

  // Special / Festival / Exhibition / Promotion months (excluded from normal average)
  const [specialMonths, setSpecialMonths] = useState<SpecialMonth[]>([]);
  const [newMonthLabel, setNewMonthLabel] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newSpecialType, setNewSpecialType] = useState<SpecialMonthType>('Festival');
  const [newMonthYear, setNewMonthYear] = useState(String(new Date().getFullYear()));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const soldFileInputRef = useRef<HTMLInputElement>(null);
  const stockFileInputRef = useRef<HTMLInputElement>(null);

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

  if (!isOpen) return null;

  const handlePeriodQuickChange = (preset: string) => {
    setQuickPeriod(preset);
    const today = new Date();
    const past = new Date(today);

    if (preset === '7d') past.setDate(today.getDate() - 7);
    else if (preset === '15d') past.setDate(today.getDate() - 15);
    else if (preset === '1m') past.setMonth(today.getMonth() - 1);
    else if (preset === '3m') past.setMonth(today.getMonth() - 3);
    else if (preset === '6m') past.setMonth(today.getMonth() - 6);
    else if (preset === '9m') past.setMonth(today.getMonth() - 9);
    else if (preset === 'ytd') {
      past.setMonth(0);
      past.setDate(1);
    } else if (preset === 'custom') {
      setPeriodText(`${formatD(fromInputDate(fromDate))} to ${formatD(fromInputDate(toDate))}`);
      return;
    }

    setFromDate(toInputDate(past));
    setToDate(toInputDate(today));
    setPeriodText(`${formatD(past)} to ${formatD(today)}`);
  };

  const handleFromToChange = (from: string, to: string) => {
    setFromDate(from);
    setToDate(to);
    setQuickPeriod('custom');
    setPeriodText(`${formatD(fromInputDate(from))} to ${formatD(fromInputDate(to))}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMsg('');
    setIsProcessing(true);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isPdf = file.name.endsWith('.pdf');

    if (isExcel || isPdf) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const result = parseUniversalInventoryData(buffer, file.name);
          setParsedResult(result);
          if (result.records.length === 0) {
            setErrorMsg(
              isPdf
                ? 'No structured tabular rows could be extracted from PDF text streams. Ensure the PDF contains selectable text, or use Excel / XML / HTML.'
                : 'No valid rows found in Excel sheet. Please ensure columns or headers match Branch, Item, Sold, Stock.'
            );
          }
        } catch (err: any) {
          setErrorMsg(`Error reading ${isPdf ? 'PDF' : 'Excel'} file: ${err.message || 'Corrupted file'}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          setInputText(content);
          const result = parseUniversalInventoryData(content, file.name);
          setParsedResult(result);
          if (result.records.length === 0) {
            setErrorMsg('No valid records found in file. Supported headers: Branch, Weight, Sold, Stock.');
          }
        } catch (err: any) {
          setErrorMsg(`Error parsing text/XML/HTML file: ${err.message}`);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDualSheetProcess = () => {
    if (!soldFileText || !stockFileText) {
      setErrorMsg('Please select or paste both the "Soldout / Sales" data AND the "Current Stock" data.');
      return;
    }

    try {
      const soldParsed = parseUniversalInventoryData(soldFileText, soldFileName || 'sold.csv');
      const stockParsed = parseUniversalInventoryData(stockFileText, stockFileName || 'stock.csv');

      // Merge into unified record list
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

      const mergedRecords: RawInventoryRecord[] = Object.values(recordMap).map((item, idx) => {
        const sold = item.soldQty || 0;
        return {
          id: `merged-dual-${idx}-${Date.now()}`,
          ...item,
          sales3M: Math.max(0, Math.round(sold * 0.4)),
          sales6M: Math.max(0, Math.round(sold * 0.7)),
          sales1Y: sold,
          sales2Y: Math.max(0, Math.round(sold * 1.8)),
          ageDays: item.currentStock > 0 && sold === 0 ? 310 : 65
        };
      });

      const branches = new Set(mergedRecords.map(r => r.branch));
      const weights = new Set(mergedRecords.map(r => r.weight));

      const dualResult: ParsedDataResult = {
        records: mergedRecords,
        detectedFormat: 'EXCEL',
        summary: {
          totalRows: mergedRecords.length,
          branchesFound: branches.size,
          weightsFound: weights.size,
          totalSold: mergedRecords.reduce((a, b) => a + b.soldQty, 0),
          totalStock: mergedRecords.reduce((a, b) => a + b.currentStock, 0)
        }
      };

      setParsedResult(dualResult);
      setErrorMsg('');
    } catch (err: any) {
      setErrorMsg(`Error combining Soldout and Current Stock files: ${err.message}`);
    }
  };

  const handleTextChange = (val: string) => {
    setInputText(val);
    setErrorMsg('');
    if (val.trim()) {
      try {
        const result = parseUniversalInventoryData(val);
        setParsedResult(result);
      } catch {
        setParsedResult(null);
      }
    } else {
      setParsedResult(null);
    }
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.records.length === 0) {
      setErrorMsg('No valid inventory records available to import.');
      return;
    }

    // Ensure multi-period sales fields exist so all timeframe analysis works after import
    const enriched = parsedResult.records.map((r) => {
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

    onImportRecords(
      enriched,
      periodText.trim() || currentPeriod,
      specialMonths.length > 0 ? specialMonths : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Universal Data Ingestion & Duration Setup
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">
                  Excel • XML • HTML • PDF • CSV
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Upload your raw Excel workbook, Soldout & Stock sheets, lightweight XML/HTML payloads, or PDF reports
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* 1. Duration / Period Selector Section */}
          <div className="bg-slate-850 border border-slate-750 p-3.5 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Select Report Duration / Period:
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
                    className={`px-2 py-0.5 rounded ${quickPeriod === p.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
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
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => handleFromToChange(fromDate, e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={periodText}
                onChange={(e) => {
                  setPeriodText(e.target.value);
                  setQuickPeriod('custom');
                }}
                placeholder="e.g. 01-03-2026 to 19-09-2026 or Q1-Q3 2026"
                className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              This period is stamped on executive movement, Excel export, KPI, and procurement reports. Choose a preset or custom dates.
            </p>
          </div>

          {/* Special / Festival / Exhibition / Promotion months */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                <PartyPopper className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-100">
                  Special Months (Festival / Exhibition / Promotion)
                </h3>
                <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
                  Within your upload period, months with Festival, Exhibition, or Promotion often have unusually high sales.
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

          {/* 2. Import Method Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Upload Excel / XML / HTML / PDF
            </button>

            <button
              onClick={() => setActiveTab('dual_sheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'dual_sheet'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Dual Upload (Soldout + Current Stock)
            </button>

            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Paste Text / XML / HTML
            </button>
          </div>

          {/* Tab 1: Single File Upload (Auto handles Excel, XML, HTML, PDF, CSV) */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-850/50 hover:bg-slate-800/60 p-6 rounded-2xl text-center transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Click to select your Excel (.xlsx / .xls), XML, HTML, PDF, or CSV file
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Automatically extracts multi-sheet data (Sales &amp; Stock tabs), XML/HTML tables, or cross-tab branch-item matrices.
                </p>
                {fileName && (
                  <div className="mt-3 inline-block px-3 py-1 rounded bg-blue-900/40 text-blue-300 font-mono text-xs font-bold border border-blue-800">
                    Selected File: {fileName}
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx,.xls,.xml,.html,.htm,.csv,.tsv,.txt,.json,.pdf"
                className="hidden"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-400 pt-1">
                <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="font-bold text-white block">Excel (.xlsx/.xls)</span>
                  Multi-sheet workbook support
                </div>
                <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="font-bold text-white block">XML / HTML</span>
                  Lightweight data pressure
                </div>
                <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="font-bold text-white block">PDF Document</span>
                  Text stream table extract
                </div>
                <div className="p-2 rounded bg-slate-800/40 border border-slate-800">
                  <span className="font-bold text-white block">CSV / TSV</span>
                  Delimited data tables
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Dual Upload (Soldout and Current Stock separate files) */}
          {activeTab === 'dual_sheet' && (
            <div className="space-y-3">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 text-xs text-slate-300">
                <p className="font-semibold text-white mb-1">Upload 2 Separate Source Files:</p>
                If your company maintains sales history in a "Soldout" file and warehouse counts in a "Current Stock" file, upload both here to instantly merge them into the master movement report.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Soldout file */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> 1. Soldout / Sales Sheet
                    </span>
                    <input
                      type="file"
                      ref={soldFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSoldFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => setSoldFileText(ev.target?.result as string);
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => soldFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Browse
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={soldFileText}
                    onChange={(e) => setSoldFileText(e.target.value)}
                    placeholder="Paste sold data (Branch, Weight, Sold Qty)..."
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 resize-none"
                  />
                  {soldFileName && <span className="text-[10px] text-slate-400 font-mono">File: {soldFileName}</span>}
                </div>

                {/* 2. Current Stock file */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 2. Current Stock Sheet
                    </span>
                    <input
                      type="file"
                      ref={stockFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setStockFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = (ev) => setStockFileText(ev.target?.result as string);
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => stockFileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      Browse
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={stockFileText}
                    onChange={(e) => setStockFileText(e.target.value)}
                    placeholder="Paste current stock data (Branch, Weight, Stock Qty)..."
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 resize-none"
                  />
                  {stockFileName && <span className="text-[10px] text-slate-400 font-mono">File: {stockFileName}</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={handleDualSheetProcess}
                className="w-full py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Merge Soldout &amp; Stock Sheets
              </button>
            </div>
          )}

          {/* Tab 3: Paste Text/XML/HTML */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Paste Data (XML, HTML &lt;table&gt;, CSV, or TSV):
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">Fill Sample:</span>
                  <button
                    onClick={() => handleTextChange(SAMPLE_CSV)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    CSV
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => handleTextChange(SAMPLE_XML)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    XML
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    onClick={() => handleTextChange(SAMPLE_HTML)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                  >
                    HTML
                  </button>
                </div>
              </div>

              <textarea
                rows={7}
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Paste CSV rows, XML (<inventory><item.../></inventory>), or an HTML <table>..."
                className="w-full text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 resize-none"
              />
            </div>
          )}

          {/* Feedback & Summary Preview */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {parsedResult && parsedResult.records.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Format Identified: [{parsedResult.detectedFormat}]
                </span>
                <span className="text-white">
                  Period: {periodText}
                </span>
              </div>
              {specialMonths.length > 0 && (
                <div className="text-amber-200/90 text-[11px] pt-0.5">
                  Special months (normalized out of average):{' '}
                  {specialMonths.map((s) => `${s.monthLabel} — ${s.eventName}`).join('; ')}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-300">
                <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Total Records</span>
                  <span className="text-sm font-bold text-white">{parsedResult.summary.totalRows}</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Branches</span>
                  <span className="text-sm font-bold text-white">{parsedResult.summary.branchesFound} branches</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Sold Units</span>
                  <span className="text-sm font-bold text-blue-400">{parsedResult.summary.totalSold} pcs</span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block">Stock In Hand</span>
                  <span className="text-sm font-bold text-emerald-400">{parsedResult.summary.totalStock} pcs</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            Active Baseline: {currentRecordsCount} records
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-data-ingestion"
              onClick={handleApply}
              disabled={!parsedResult || parsedResult.records.length === 0}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Generate Comprehensive Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
