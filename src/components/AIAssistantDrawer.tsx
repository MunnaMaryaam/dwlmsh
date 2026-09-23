import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, RefreshCw, Lightbulb, FileSpreadsheet } from 'lucide-react';
import { RedistributionReport } from '../types';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  report: RedistributionReport;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  report
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am **Movement Analysis AI**, your universal jewelry inventory intelligence copilot.

I have analyzed your **${report.branchSummaries.length} branches** and **${report.totalCurrentStock} stock units**:
• **Top Shortage:** ${report.topShortageBranches[0]?.branch || 'Online'} (High sales, zero stock)
• **Top Overstock:** ${report.topOverstockedBranches[0]?.branch || 'Savar'} (High stock, low sales)
• **Top Best-Seller:** ${report.top5BestSellingWeights[0]?.weight || '—'}
• **Top Slow-Moving:** ${report.top5SlowMovingWeights[0]?.weight || '—'}
• **Intra-Branch Transfers:** ${report.transferOrders.length} transfer orders generated
• **New Purchases Needed:** ${report.totalNewStockToBuy} pieces

How can I assist your inventory distribution strategy today?`
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (promptToSend?: string) => {
    const query = promptToSend || inputPrompt;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages((prev) => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      // Simplified metrics payload for Gemini
      const metricsContext = {
        period: report.period,
        totalSold: report.totalSold,
        totalStock: report.totalCurrentStock,
        totalMoveIn: report.totalMoveIn,
        totalMoveOut: report.totalMoveOut,
        netStockPosition: report.netStockPosition,
        newStockToBuy: report.totalNewStockToBuy,
        topOverstockedBranches: report.topOverstockedBranches.map((b) => ({
          branch: b.branch,
          stock: b.totalCurrentStock,
          sold: b.totalSold,
          net: b.netChange
        })),
        topShortageBranches: report.topShortageBranches.map((b) => ({
          branch: b.branch,
          stock: b.totalCurrentStock,
          sold: b.totalSold,
          net: b.netChange
        })),
        top5BestSellingWeights: report.top5BestSellingWeights.map((w) => ({
          weight: w.weight,
          sold: w.soldQty,
          stock: w.currentStock
        })),
        top5SlowMovingWeights: report.top5SlowMovingWeights.map((w) => ({
          weight: w.weight,
          sold: w.soldQty,
          stock: w.currentStock
        })),
        transferOrders: report.transferOrders.map((t) => ({
          from: t.fromBranch,
          to: t.toBranch,
          weight: t.weight,
          qty: t.qty,
          priority: t.priority
        })),
        procurementOrders: report.procurementOrders.map((p) => ({
          weight: p.weight,
          qtyToBuy: p.qtyToBuy
        }))
      };

      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          metricsContext
        })
      });

      const data = await res.json();
      const aiReply = data.analysis || data.error || 'I have audited your uploaded jewelry inventory distribution data.';

      setMessages((prev) => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to complete real-time AI query: ${err.message}. Using built-in heuristics: Prioritize dispatching ${report.transferOrders.length} transfer orders immediately to mitigate walkouts at ${report.topShortageBranches[0]?.branch}.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Audit top stock imbalances & risk of customer walkout',
    'Draft dispatch orders for store managers',
    'Calculate capital locked in slow-moving items',
    'How should we allocate the 12 newly purchased units?'
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-left">
      
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Movement Analysis AI
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                Gemini Powered
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Retail intelligence & inventory copilot</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-blue-600/30 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-3 leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/80 whitespace-pre-line'
              }`}
            >
              {m.content}
            </div>

            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Analyzing inventory distribution logic with Gemini...
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40">
        <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5 flex items-center gap-1">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          Suggested Intelligence Inquiries
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(qp)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Movement Analysis AI about branch transfers..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
};
