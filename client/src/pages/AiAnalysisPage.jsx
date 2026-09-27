import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { formatCurrency } from '../utils/formatters';
import {
  Sparkles,
  Bot,
  User,
  Send,
  TrendingUp,
  Lightbulb,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  'How much did I spend this month?',
  'Who owes me the most?',
  'How much money do I currently owe?',
  'What was my biggest expense?',
  'How much did I spend on food this month?',
  'Compare my spending with last month',
];

const AiAnalysisPage = () => {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'assistant'
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // AI Assistant State
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your PocketGuard AI Financial Assistant. Ask me anything about your income, spending patterns, or lending records!",
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const chatEndRef = useRef(null);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await aiService.getSummary();
      if (res.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, queryLoading]);

  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMessage = { sender: 'user', text: textToSend.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setQueryLoading(true);

    try {
      const res = await aiService.queryAssistant(textToSend.trim());
      if (res.success && res.data) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'assistant',
            text: res.data.answer,
            source: res.data.source,
            model: res.data.model,
          },
        ]);
      }
    } catch (err) {
      console.error('AI assistant query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Sorry, I encountered an issue analyzing your financial records. Please try again.',
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  const metrics = summaryData?.metrics;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Financial Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              Smart Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Automated financial breakdown, cash-flow trends, and natural-language query assistant
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Financial Summary
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'assistant'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AI Assistant Chat
          </button>
        </div>
      </div>

      {/* Tab 1: AI Summary & Analysis */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {loadingSummary ? (
            <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Analyzing your transactions and lending database...
            </div>
          ) : !summaryData ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Unable to generate financial summary at this time.
            </div>
          ) : (
            <>
              {/* Executive Summary Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-purple-800/40 relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Executive Financial Overview
                      {summaryData.aiGenerated && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✨ AI Active ({summaryData.model || 'Gemini'})
                        </span>
                      )}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-200">
                      Cash Flow: {summaryData.cashFlowStatus}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {summaryData.headline}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {summaryData.highlights?.map((point, index) => (
                      <div
                        key={index}
                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-purple-100 flex items-start gap-2.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid: Spending Breakdown & Lending Risk */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Spending Analysis */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    <h3>Spending Patterns & Trends</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {summaryData.spendingPatternInsights}
                  </p>
                  {metrics && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Top Category:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {metrics.topCategory} ({metrics.topCategoryPercentage}%)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Largest Single Expense:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {metrics.biggestExpense?.description} ({formatCurrency(metrics.biggestExpense?.amount)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Month-over-Month Change:</span>
                        <span
                          className={`font-bold ${
                            metrics.momExpenseChange > 0 ? 'text-rose-500' : 'text-emerald-500'
                          }`}
                        >
                          {metrics.momExpenseChange > 0 ? '+' : ''}
                          {metrics.momExpenseChange}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lending Risk & Debt */}
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <h3>Lending & Debt Insights</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {summaryData.lendingInsights}
                  </p>
                  {metrics && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Money Pending Collection:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(metrics.totalReceivable)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Largest Pending Debtor:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {metrics.biggestDebtor?.name} ({formatCurrency(metrics.biggestDebtor?.amount)})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Money You Owe:</span>
                        <span className="font-bold text-rose-500">
                          {formatCurrency(metrics.totalPayable)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actionable Savings Suggestions */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  <h3>Actionable Financial Observations</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  {summaryData.actionableTips?.map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300"
                    >
                      <p className="leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Interactive AI Assistant Chat */}
      {activeTab === 'assistant' && (
        <div className="h-[calc(100vh-14rem)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                PocketGuard AI Financial Assistant
              </h3>
              <p className="text-[11px] text-slate-400">
                Connected to your real-time MongoDB transaction and lending ledger
              </p>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  m.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.source && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-[10px]">
                      {m.source === 'gemini' ? (
                        <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                          <Sparkles className="w-2.5 h-2.5" />
                          Generated by {m.model || 'Gemini AI'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          Built-in Analytical Engine
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {queryLoading && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400 italic">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <span>Analyzing your financial data...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick-Prompt Chips */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 ml-1">
              Ask:
            </span>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendQuery(prompt)}
                disabled={queryLoading}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question about your spending, debt, or savings..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || queryLoading}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-md shadow-purple-600/20 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AiAnalysisPage;
