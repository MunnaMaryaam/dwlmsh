import React from 'react';
import { AlertTriangle, ArrowRightLeft, ShieldAlert, Sparkles, ShoppingCart } from 'lucide-react';
import { ActionAlert, TransferOrder } from '../types';

interface ActionableAlertsProps {
  alerts: ActionAlert[];
  onSelectTransfer?: (transfer: TransferOrder) => void;
  onNavigateToTab: (tabId: string) => void;
}

export const ActionableAlerts: React.FC<ActionableAlertsProps> = ({
  alerts,
  onNavigateToTab
}) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Actionable Inventory Alerts
              <span className="text-[11px] px-2 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                {alerts.length} Pending Actions
              </span>
            </h2>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('redistribution')}
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
        >
          View Transfer Orders
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.slice(0, 3).map((alert) => {
          let badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/30";
          let icon = <AlertTriangle className="w-4 h-4 text-rose-400" />;

          if (alert.type === 'TRANSFER_OPPORTUNITY') {
            badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
            icon = <ArrowRightLeft className="w-4 h-4 text-blue-400" />;
          } else if (alert.type === 'PROCUREMENT_REQUIRED') {
            badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
            icon = <ShoppingCart className="w-4 h-4 text-amber-400" />;
          }

          return (
            <div
              key={alert.id}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg p-3.5 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {icon}
                    <span className="text-xs font-semibold text-white line-clamp-1">
                      {alert.title}
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}>
                    {alert.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                  {alert.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-[11px] text-cyan-300 font-medium line-clamp-1">
                  💡 {alert.actionText}
                </span>
                <button
                  onClick={() => onNavigateToTab('redistribution')}
                  className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors shrink-0 ml-2"
                >
                  Resolve
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
