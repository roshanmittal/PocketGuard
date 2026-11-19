import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Sparkles,
  Bot,
  User,
  Send,
  TrendingUp,
  Lightbulb,
  ShieldAlert,
  RefreshCw,
  Check,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Wallet,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Tag,
  Clock,
  ArrowRight,
} from 'lucide-react';

const SUGGESTED_PROMPTS = [
  { label: 'Add a new expense', query: 'I spent ₹500 on food today.' },
  { label: 'Record my income', query: 'I received ₹5,000 from Rahul today.' },
  { label: 'I lent someone money', query: 'I lent ₹2,000 to Rahul.' },
  { label: 'Check my current balance', query: 'Check my current balance' },
  { label: 'Who owes me the most?', query: 'Who owes me the most money?' },
  { label: 'Show recent transactions', query: 'Show my recent transactions.' },
  { label: 'How much did I spend this month?', query: 'How much did I spend this month?' },
];

const AiAnalysisPage = () => {
  const { user, refreshUser } = useAuth();
  const { subscribeToFinancialUpdates } = useSocket();

  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'assistant'
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // AI Assistant Chat State
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: "Hello! I am your PocketGuard AI Financial Assistant.\n\nYou can ask me financial questions (e.g. *\"How much did I spend this month?\"*, *\"Who owes me the most?\"*) or manage your finances through natural commands (e.g. *\"I spent ₹500 on food today\"*, *\"I received ₹5,000 from Rahul today\"*, *\"I lent ₹2,000 to Rahul\"*).\n\nAll financial transactions require your explicit confirmation before being recorded into MongoDB.",
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
      console.error('Failed to load financial summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Real-time synchronization: subscribe to socket financial events
  useEffect(() => {
    if (!subscribeToFinancialUpdates) return;
    const unsubscribe = subscribeToFinancialUpdates(() => {
      fetchSummary();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToFinancialUpdates]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, queryLoading]);

  // Send natural language query or transaction command
  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setQueryLoading(true);

    try {
      const res = await aiService.queryAssistant(textToSend.trim());
      if (res.success && res.data) {
        const assistantMessage = {
          id: `asst_${Date.now()}`,
          sender: 'assistant',
          text: res.data.answer,
          source: res.data.source,
          model: res.data.model,
          actionPreview: res.data.actionPreview
            ? {
                ...res.data.actionPreview,
                status: 'pending',
              }
            : null,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      console.error('AI assistant query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I encountered an issue analyzing your financial records. Please try again.',
        },
      ]);
    } finally {
      setQueryLoading(false);
    }
  };

  // User confirms the transaction in the chat preview card
  const handleConfirmAction = async (messageId, actionPreview) => {
    // Set card to confirming state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.actionPreview
          ? { ...m, actionPreview: { ...m.actionPreview, status: 'confirming', errorMessage: null } }
          : m
      )
    );

    try {
      const res = await aiService.executeAction(actionPreview.actionType, actionPreview);
      if (res.success) {
        // Mark card confirmed
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.actionPreview
              ? {
                  ...m,
                  actionPreview: {
                    ...m.actionPreview,
                    status: 'confirmed',
                    executedResult: res.data,
                  },
                }
              : m
          )
        );

        // Append assistant follow-up response
        const newBalance = res.data?.walletBalance !== undefined ? res.data.walletBalance : null;
        const balanceNotice = newBalance !== null ? ` Your updated wallet balance is **${formatCurrency(newBalance)}**.` : '';
        setMessages((prev) => [
          ...prev,
          {
            id: `done_${Date.now()}`,
            sender: 'assistant',
            text: `✅ **Transaction Confirmed & Executed!**\n${res.message || 'The transaction has been successfully recorded into your MongoDB database.'}${balanceNotice}`,
          },
        ]);

        // Refresh global user state and Financial Insights tab
        if (refreshUser) refreshUser();
        fetchSummary();
      } else {
        throw new Error(res.message || 'Execution failed');
      }
    } catch (err) {
      console.error('Action execution failed:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to record transaction';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && m.actionPreview
            ? { ...m, actionPreview: { ...m.actionPreview, status: 'pending', errorMessage: errMsg } }
            : m
        )
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `fail_${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ **Action could not be executed:** ${errMsg}. You can retry confirming or cancel.`,
        },
      ]);
    }
  };

  // User cancels the transaction preview
  const handleCancelAction = (messageId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.actionPreview
          ? { ...m, actionPreview: { ...m.actionPreview, status: 'cancelled' } }
          : m
      )
    );

    setMessages((prev) => [
      ...prev,
      {
        id: `cancel_${Date.now()}`,
        sender: 'assistant',
        text: '❌ **Transaction cancelled.** No financial records were modified in your MongoDB ledger.',
      },
    ]);
  };

  const metrics = summaryData?.metrics;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Financial Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              Smart Ledger
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time financial analysis, cash-flow trends, and conversational transaction assistant
          </p>
        </div>

        {/* Tab switch: Financial Insights vs AI Financial Assistant */}
        <div className="flex items-center p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto shadow-sm">
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'insights'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Financial Insights
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'assistant'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            AI Financial Assistant
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FINANCIAL INSIGHTS */}
      {/* ========================================================================= */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {loadingSummary ? (
            <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
              Analyzing your real-time transactions and lending records from MongoDB...
            </div>
          ) : !summaryData ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              Unable to generate financial summary at this time.
            </div>
          ) : (
            <>
              {/* Quick Metrics Bar */}
              {metrics && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Wallet Balance</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                      {formatCurrency(metrics.walletBalance || user?.walletBalance || 0)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Income (This Month)</p>
                    <p className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(metrics.thisMonthIncome)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Expense (This Month)</p>
                    <p className="text-base sm:text-lg font-extrabold text-rose-500 mt-0.5">
                      {formatCurrency(metrics.thisMonthExpense)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Net Surplus / Savings</p>
                    <p className={`text-base sm:text-lg font-extrabold mt-0.5 ${metrics.netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {formatCurrency(metrics.netSavings)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Collection</p>
                    <p className="text-base sm:text-lg font-extrabold text-teal-600 dark:text-teal-400 mt-0.5">
                      {formatCurrency(metrics.totalReceivable)}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Money You Owe</p>
                    <p className="text-base sm:text-lg font-extrabold text-amber-500 mt-0.5">
                      {formatCurrency(metrics.totalPayable)}
                    </p>
                  </div>
                </div>
              )}

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
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-purple-200">
                        Cash Flow: {summaryData.cashFlowStatus}
                      </span>
                      <button
                        onClick={fetchSummary}
                        disabled={loadingSummary}
                        className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 transition-colors"
                        title="Refresh Financial Insights"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSummary ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
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
                          {metrics.topCategory} ({metrics.topCategoryPercentage}% of expenses)
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
                      <div className="flex justify-between">
                        <span className="text-slate-500">Largest Pending Creditor:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {metrics.biggestCreditor?.name} ({formatCurrency(metrics.biggestCreditor?.amount)})
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

      {/* ========================================================================= */}
      {/* TAB 2: AI FINANCIAL ASSISTANT (CONVERSATIONAL TRANSACTION MANAGEMENT) */}
      {/* ========================================================================= */}
      {activeTab === 'assistant' && (
        <div className="h-[calc(100vh-14rem)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  PocketGuard AI Financial Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-400">
                  Connected to your real-time MongoDB transaction & lending ledger
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              <Wallet className="w-3.5 h-3.5 text-purple-500" />
              <span>Balance: {formatCurrency(user?.walletBalance || 0)}</span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${
                  m.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                    m.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-600/10'
                      : 'bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                  {/* Transaction Preview Card (Confirmation Workflow) */}
                  {m.actionPreview && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 shadow-sm space-y-3">
                        {/* Card Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Receipt className="w-3.5 h-3.5" />
                            {m.actionPreview.displayType || 'Transaction Preview'}
                          </span>

                          {/* Status Pill */}
                          {m.actionPreview.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              Awaiting Confirmation
                            </span>
                          )}
                          {m.actionPreview.status === 'confirming' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              Saving to MongoDB...
                            </span>
                          )}
                          {m.actionPreview.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Confirmed & Recorded
                            </span>
                          )}
                          {m.actionPreview.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              <XCircle className="w-3.5 h-3.5" />
                              Cancelled
                            </span>
                          )}
                        </div>

                        {/* Amount Hero */}
                        <div className="py-1">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Transaction Amount
                          </p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                            {formatCurrency(m.actionPreview.amount)}
                          </p>
                        </div>

                        {/* Key-Value Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                          {m.actionPreview.contactName && (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                Person:
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {m.actionPreview.contactName}
                              </span>
                            </div>
                          )}
                          {m.actionPreview.category && (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                Category:
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white">
                                {m.actionPreview.category}
                              </span>
                            </div>
                          )}
                          {m.actionPreview.description && (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 sm:col-span-2">
                              <span className="text-slate-500 flex items-center gap-1">
                                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                                Description:
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                {m.actionPreview.description}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 sm:col-span-2">
                            <span className="text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              Date:
                            </span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {new Date(m.actionPreview.date || Date.now()).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Error notice if retry needed */}
                        {m.actionPreview.errorMessage && (
                          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{m.actionPreview.errorMessage}</span>
                          </div>
                        )}

                        {/* Actions (Only when pending) */}
                        {m.actionPreview.status === 'pending' && (
                          <div className="pt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmAction(m.id, m.actionPreview)}
                              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              Confirm Transaction
                            </button>
                            <button
                              onClick={() => handleCancelAction(m.id)}
                              className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 font-semibold text-xs border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Confirmed Notice */}
                        {m.actionPreview.status === 'confirmed' && (
                          <div className="pt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved in MongoDB. Ledger & wallet balance updated.</span>
                          </div>
                        )}

                        {/* Cancelled Notice */}
                        {m.actionPreview.status === 'cancelled' && (
                          <div className="pt-1 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Operation cancelled. No changes were made.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Engine Source Badge */}
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

            {/* Thinking / Loading indicator */}
            {queryLoading && (
              <div className="flex gap-3 justify-start items-center text-xs text-slate-400 italic">
                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <span>Analyzing your financial data and preparing response...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick-Prompt Chips Carousel */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 ml-1">
              Quick:
            </span>
            {SUGGESTED_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuery(p.query)}
                disabled={queryLoading}
                className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-[11px] font-medium border border-slate-200 dark:border-slate-700 shrink-0 transition-colors"
              >
                {p.label}
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
              placeholder='Try: "I spent ₹500 on food today", "I received ₹5,000 from Rahul", or "Who owes me the most?"'
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={queryLoading}
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || queryLoading}
              className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white shadow-md shadow-purple-600/20 transition-all active:scale-95"
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
