import React from 'react';
import { RedistributionReport, ConsignmentRecommendation } from '../types';
import {
  PackagePlus,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Home
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ConsignmentShipmentPlannerViewProps {
  report: RedistributionReport;
  onSelectWeight?: (weight: string) => void;
  onBackToHome?: () => void;
}

export const ConsignmentShipmentPlannerView: React.FC<ConsignmentShipmentPlannerViewProps> = ({
  report,
  onSelectWeight,
  onBackToHome
}) => {
  const recommendations = report.consignmentRecommendations || [];
  const itemLabel = report.categoryConfig?.itemLabel || 'Item / SKU / Variant';
  const itemUnit = report.categoryConfig?.itemUnit || 'pcs';

  const totalRecommendedPcs = recommendations.reduce((sum, r) => sum + r.recommendedConsignmentPcs, 0);
  const totalSalesUpliftBdt = recommendations.reduce((sum, r) => sum + r.estimatedSalesUpliftBdt, 0);

  const handleExportConsignmentExcel = () => {
    const exportData = recommendations.map((r, idx) => ({
      "SL": idx + 1,
      "Item / SKU / Variant": r.weight,
      "Current Network Stock": r.currentNetworkStock,
      "Recent Sales Demand": r.recentSalesDemand,
      "Demand Velocity": r.demandVelocity,
      "Stockout Risk": r.stockoutRisk,
      "Recommended Consignment Order (Pcs)": r.recommendedConsignmentPcs,
      "Projected Sales Uplift (BDT)": r.estimatedSalesUpliftBdt,
      "Market Justification": r.marketReason
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "New Consignment Plan");
    XLSX.writeFile(wb, `Diamond_World_Consignment_Order_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6" id="consignment-planner-root">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-900/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 text-xs font-bold border border-emerald-700/80 hover:text-white transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Return to Home / Executive Dashboard"
                >
                  <Home className="w-3.5 h-3.5 text-emerald-300" />
                  <span>← Back to Home</span>
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold uppercase tracking-wider border border-emerald-500/30">
                <PackagePlus className="w-3.5 h-3.5" />
                New Shipment &amp; Consignment Requisition
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <span>Sales Demand Booster: What Products to Import</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Analyzes historical sales demand against depleted company stock. Bringing these specific high-demand items in the next shipment will directly restore lost sales and maximize revenue.
            </p>
          </div>

          <button
            onClick={handleExportConsignmentExcel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all self-start lg:self-auto shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Consignment PO (Excel)
          </button>
        </div>

        {/* Totals Row */}
        <div className="mt-6 pt-4 border-t border-emerald-900/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Consignment Items</span>
            <span className="text-xl font-bold text-slate-100">{recommendations.length} <span className="text-xs font-normal text-slate-400">products</span></span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block font-medium">Recommended Order Qty</span>
            <span className="text-xl font-bold text-emerald-400">{totalRecommendedPcs} <span className="text-xs font-normal text-emerald-300/80">pcs</span></span>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 col-span-2">
            <span className="text-[11px] text-slate-400 block font-medium">Estimated Sales Uplift</span>
            <span className="text-xl font-bold text-amber-400">${totalSalesUpliftBdt.toLocaleString()} <span className="text-xs font-normal text-slate-400">projected revenue</span></span>
          </div>
        </div>
      </div>

      {/* Main Recommendations Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Priority Consignment Requisitions ({recommendations.length} Items with High Customer Demand)
            </h3>
            <p className="text-xs text-slate-500">
              Sorted by highest recent demand velocity and lowest network stock
            </p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">{itemLabel}</th>
                <th className="py-3 px-3 text-center">Network Stock</th>
                <th className="py-3 px-3 text-center">Sales Demand</th>
                <th className="py-3 px-3 text-center">Stockout Risk</th>
                <th className="py-3 px-3 text-center">Recommended Order</th>
                <th className="py-3 px-3 text-right">Projected Revenue Boost</th>
                <th className="py-3 px-4">Market Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recommendations.map((r) => (
                <tr
                  key={r.weight}
                  onClick={() => onSelectWeight && onSelectWeight(r.weight)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {r.weight}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-800">
                    {r.currentNetworkStock} pcs
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600">
                    {r.recentSalesDemand} pcs sold
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.stockoutRisk === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      {r.stockoutRisk}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-extrabold text-indigo-700 bg-indigo-50/50">
                    +{r.recommendedConsignmentPcs} pcs
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    ${r.estimatedSalesUpliftBdt.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                    {r.marketReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {recommendations.map((r) => (
            <div
              key={r.weight}
              onClick={() => onSelectWeight && onSelectWeight(r.weight)}
              className="p-3.5 space-y-2 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-900 text-sm">{r.weight}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-md">
                  Order: +{r.recommendedConsignmentPcs} pcs
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Current Stock</span>
                  <span className="font-bold text-slate-800">{r.currentNetworkStock} pcs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Sales Demand</span>
                  <span className="font-bold text-emerald-600">{r.recentSalesDemand} pcs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Revenue Boost</span>
                  <span className="font-bold text-emerald-700">${(r.estimatedSalesUpliftBdt / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-tight">
                {r.marketReason}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
