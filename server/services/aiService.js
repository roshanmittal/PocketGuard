/**
 * Modular AI Service for PocketGuard
 * Analyzes actual user transaction and lending data.
 * Can integrate with Gemini or other LLM APIs, with an intelligent built-in analytical engine
 * that ensures zero downtime and 100% accurate financial computation even without external keys.
 */

// Helper to calculate financial metrics from user transactions and lending relationships
const computeFinancialMetrics = (transactions, lendingRelationships, currentUserId) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;
  let lastMonthIncome = 0;
  let lastMonthExpense = 0;
  const categoryExpenses = {};
  let biggestExpense = { amount: 0, description: 'None', category: 'None', date: null };

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    const isLastMonth = txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear;

    if (tx.type === 'income') {
      if (isCurrentMonth) thisMonthIncome += tx.amount;
      if (isLastMonth) lastMonthIncome += tx.amount;
    } else if (tx.type === 'expense') {
      if (isCurrentMonth) {
        thisMonthExpense += tx.amount;
        categoryExpenses[tx.category] = (categoryExpenses[tx.category] || 0) + tx.amount;
        if (tx.amount > biggestExpense.amount) {
          biggestExpense = {
            amount: tx.amount,
            description: tx.description || tx.category,
            category: tx.category,
            date: tx.date,
          };
        }
      }
      if (isLastMonth) {
        lastMonthExpense += tx.amount;
      }
    }
  });

  // Calculate lending metrics
  let totalReceivable = 0;
  let totalPayable = 0;
  let biggestDebtor = { name: 'None', amount: 0 };
  let biggestCreditor = { name: 'None', amount: 0 };

  lendingRelationships.forEach((rel) => {
    const p = typeof rel.getPerspective === 'function' ? rel.getPerspective(currentUserId) : rel;
    if (p.netBalance > 0) {
      totalReceivable += p.netBalance;
      if (p.netBalance > biggestDebtor.amount) {
        biggestDebtor = { name: p.counterparty?.name || 'Contact', amount: p.netBalance };
      }
    } else if (p.netBalance < 0) {
      const debt = Math.abs(p.netBalance);
      totalPayable += debt;
      if (debt > biggestCreditor.amount) {
        biggestCreditor = { name: p.counterparty?.name || 'Contact', amount: debt };
      }
    }
  });

  // Find top category
  let topCategory = 'None';
  let topCategoryAmount = 0;
  Object.entries(categoryExpenses).forEach(([cat, amt]) => {
    if (amt > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = amt;
    }
  });

  const topCategoryPercentage = thisMonthExpense > 0
    ? Math.round((topCategoryAmount / thisMonthExpense) * 100)
    : 0;

  // Expense month-over-month change
  let momExpenseChange = 0;
  if (lastMonthExpense > 0) {
    momExpenseChange = Math.round(((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100);
  }

  return {
    thisMonthIncome,
    thisMonthExpense,
    netSavings: thisMonthIncome - thisMonthExpense,
    lastMonthIncome,
    lastMonthExpense,
    momExpenseChange,
    categoryExpenses,
    topCategory,
    topCategoryAmount,
    topCategoryPercentage,
    biggestExpense,
    totalReceivable,
    totalPayable,
    biggestDebtor,
    biggestCreditor,
    transactionCount: transactions.length,
    activeLendingCount: lendingRelationships.filter((r) => {
      const p = typeof r.getPerspective === 'function' ? r.getPerspective(currentUserId) : r;
      return p.netBalance !== 0;
    }).length,
  };
};

/**
 * Generate Structured Financial Summary
 */
const generateFinancialSummary = async (transactions, lendingRelationships, userId, userName = 'User') => {
  const metrics = computeFinancialMetrics(transactions, lendingRelationships, userId);

  // If Gemini or OpenAI key is available, we can format a prompt and query the API
  const apiKey = process.env.AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are PocketGuard's intelligent financial analysis engine.
Analyze the following authentic financial metrics for ${userName}:
- Income this month: ₹${metrics.thisMonthIncome.toLocaleString('en-IN')}
- Expenses this month: ₹${metrics.thisMonthExpense.toLocaleString('en-IN')}
- Net Savings: ₹${metrics.netSavings.toLocaleString('en-IN')}
- Prior month expenses: ₹${metrics.lastMonthExpense.toLocaleString('en-IN')} (Change: ${metrics.momExpenseChange}%)
- Top spending category: ${metrics.topCategory} (₹${metrics.topCategoryAmount.toLocaleString('en-IN')}, ${metrics.topCategoryPercentage}% of expenses)
- Money other people owe ${userName}: ₹${metrics.totalReceivable.toLocaleString('en-IN')} (Largest: ${metrics.biggestDebtor.name} owes ₹${metrics.biggestDebtor.amount.toLocaleString('en-IN')})
- Money ${userName} owes to others: ₹${metrics.totalPayable.toLocaleString('en-IN')} (Largest: Owes ${metrics.biggestCreditor.name} ₹${metrics.biggestCreditor.amount.toLocaleString('en-IN')})

Provide a structured, engaging, and professional fintech executive summary.
Return ONLY valid JSON matching this schema:
{
  "headline": "A punchy summary title",
  "highlights": ["point 1", "point 2", "point 3", "point 4"],
  "cashFlowStatus": "Positive" | "Balanced" | "Attention Needed",
  "spendingPatternInsights": "Short breakdown of spending trends",
  "lendingInsights": "Short breakdown of lending risk/receivables",
  "actionableTips": ["smart tip 1", "smart tip 2", "smart tip 3"]
}
Keep recommendations realistic, grounded in recorded data, and never promise guaranteed financial advice.`;

      // Call Gemini API (using standard v1beta API format)
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          return {
            success: true,
            metrics,
            aiGenerated: true,
            ...parsed,
          };
        }
      }
    } catch (err) {
      console.warn('External AI call failed, falling back to built-in analytics engine:', err.message);
    }
  }

  // Built-in intelligent analytics engine (Deterministic & fast)
  let cashFlowStatus = 'Positive';
  if (metrics.thisMonthExpense > metrics.thisMonthIncome && metrics.thisMonthIncome > 0) {
    cashFlowStatus = 'Attention Needed';
  } else if (metrics.thisMonthExpense === metrics.thisMonthIncome) {
    cashFlowStatus = 'Balanced';
  }

  const highlights = [];
  highlights.push(`You earned ₹${metrics.thisMonthIncome.toLocaleString('en-IN')} and spent ₹${metrics.thisMonthExpense.toLocaleString('en-IN')} this month.`);
  if (metrics.topCategory !== 'None') {
    highlights.push(`Your largest spending category was ${metrics.topCategory}, representing ${metrics.topCategoryPercentage}% of total outflow.`);
  }
  if (metrics.momExpenseChange !== 0) {
    const dir = metrics.momExpenseChange > 0 ? 'increased' : 'decreased';
    highlights.push(`Your monthly expenses ${dir} by ${Math.abs(metrics.momExpenseChange)}% compared to last month.`);
  }
  if (metrics.totalReceivable > 0) {
    highlights.push(`You have ₹${metrics.totalReceivable.toLocaleString('en-IN')} pending to be collected from ${metrics.biggestDebtor.name !== 'None' ? metrics.biggestDebtor.name + ' and others' : 'debtors'}.`);
  }
  if (metrics.totalPayable > 0) {
    highlights.push(`You currently owe ₹${metrics.totalPayable.toLocaleString('en-IN')} to other parties.`);
  }

  const actionableTips = [];
  if (metrics.topCategoryPercentage > 35) {
    actionableTips.push(`Consider capping ${metrics.topCategory} expenses; it currently accounts for ${metrics.topCategoryPercentage}% of your total budget.`);
  }
  if (metrics.totalReceivable > metrics.thisMonthIncome * 0.3 && metrics.totalReceivable > 0) {
    actionableTips.push(`You have significant outstanding receivables (₹${metrics.totalReceivable.toLocaleString('en-IN')}). Use PocketGuard chat to follow up on pending repayments.`);
  }
  if (metrics.netSavings > 0) {
    actionableTips.push(`You have a positive net surplus of ₹${metrics.netSavings.toLocaleString('en-IN')} this month. Good job keeping expenses below income.`);
  } else {
    actionableTips.push(`Your expenses are matching or exceeding income this month. Review your non-essential category transactions.`);
  }

  return {
    success: true,
    metrics,
    aiGenerated: false,
    headline: `Financial Performance & Risk Overview for ${userName}`,
    highlights,
    cashFlowStatus,
    spendingPatternInsights: `Main spending concentration is in ${metrics.topCategory} with ${metrics.transactionCount} total recorded transactions.`,
    lendingInsights: metrics.totalReceivable > 0
      ? `You have ₹${metrics.totalReceivable.toLocaleString('en-IN')} pending collection. ${metrics.biggestDebtor.name} owes the largest portion (₹${metrics.biggestDebtor.amount.toLocaleString('en-IN')}).`
      : 'You have no outstanding money owed to you.',
    actionableTips,
  };
};

/**
 * Handle Conversational AI Assistant Query
 */
const answerFinancialQuery = async (query, transactions, lendingRelationships, userId, userName = 'User') => {
  const metrics = computeFinancialMetrics(transactions, lendingRelationships, userId);
  const normalizedQuery = query.toLowerCase().trim();

  // Check for external LLM key
  const apiKey = process.env.AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are PocketGuard AI, a helpful, polite, and accurate personal financial assistant.
User: ${userName}
User Query: "${query}"

Here is the exact real-time financial context from the user's database:
- Total Transactions recorded: ${metrics.transactionCount}
- This Month's Income: ₹${metrics.thisMonthIncome.toLocaleString('en-IN')}
- This Month's Expenses: ₹${metrics.thisMonthExpense.toLocaleString('en-IN')}
- Net Savings this Month: ₹${metrics.netSavings.toLocaleString('en-IN')}
- Last Month's Expenses: ₹${metrics.lastMonthExpense.toLocaleString('en-IN')}
- Month-over-month expense change: ${metrics.momExpenseChange}%
- Biggest Single Expense this Month: ${metrics.biggestExpense.description} (₹${metrics.biggestExpense.amount.toLocaleString('en-IN')}, Category: ${metrics.biggestExpense.category})
- Category breakdown: ${JSON.stringify(metrics.categoryExpenses)}
- Total Money others owe user: ₹${metrics.totalReceivable.toLocaleString('en-IN')}
- Person who owes the most: ${metrics.biggestDebtor.name} (₹${metrics.biggestDebtor.amount.toLocaleString('en-IN')})
- Total Money user owes others: ₹${metrics.totalPayable.toLocaleString('en-IN')}
- Person user owes the most to: ${metrics.biggestCreditor.name} (₹${metrics.biggestCreditor.amount.toLocaleString('en-IN')})

Answer the user's question directly, accurately, concisely, and warmly. Base your answer strictly on the above data. Do not make up figures. Use ₹ (INR) symbols.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { answer: text.trim(), source: 'gemini' };
        }
      }
    } catch (err) {
      console.warn('External AI query failed, falling back to local NLP handler:', err.message);
    }
  }

  // Local Intent Resolver (Zero dependency, extremely robust)
  if (normalizedQuery.includes('spend') && (normalizedQuery.includes('this month') || normalizedQuery.includes('month'))) {
    return {
      answer: `You have spent **₹${metrics.thisMonthExpense.toLocaleString('en-IN')}** this month. Your top category was **${metrics.topCategory}** (₹${metrics.topCategoryAmount.toLocaleString('en-IN')}).`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('earn') || normalizedQuery.includes('income')) {
    return {
      answer: `You earned **₹${metrics.thisMonthIncome.toLocaleString('en-IN')}** this month, with a net savings of **₹${metrics.netSavings.toLocaleString('en-IN')}**.`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('who owes me') || normalizedQuery.includes('owes me the most') || normalizedQuery.includes('owe me')) {
    if (metrics.totalReceivable === 0) {
      return {
        answer: 'Currently, no one owes you any money. All your lending records are settled!',
        source: 'local_engine',
      };
    }
    return {
      answer: `People owe you a total of **₹${metrics.totalReceivable.toLocaleString('en-IN')}**. The person who owes you the most is **${metrics.biggestDebtor.name}**, with an outstanding balance of **₹${metrics.biggestDebtor.amount.toLocaleString('en-IN')}**.`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('how much do i owe') || normalizedQuery.includes('i owe') || normalizedQuery.includes('my debt')) {
    if (metrics.totalPayable === 0) {
      return {
        answer: 'You currently have zero outstanding debts! You do not owe money to anyone.',
        source: 'local_engine',
      };
    }
    return {
      answer: `You currently owe a total of **₹${metrics.totalPayable.toLocaleString('en-IN')}** to others. Your largest pending obligation is to **${metrics.biggestCreditor.name}** for **₹${metrics.biggestCreditor.amount.toLocaleString('en-IN')}**.`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('biggest expense') || normalizedQuery.includes('highest expense') || normalizedQuery.includes('most expensive')) {
    if (metrics.biggestExpense.amount === 0) {
      return {
        answer: 'You have not recorded any expenses for this month yet.',
        source: 'local_engine',
      };
    }
    return {
      answer: `Your biggest expense this month was **${metrics.biggestExpense.description}** for **₹${metrics.biggestExpense.amount.toLocaleString('en-IN')}** under the **${metrics.biggestExpense.category}** category.`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('food') || normalizedQuery.includes('dining') || normalizedQuery.includes('grocery')) {
    const foodAmt = (metrics.categoryExpenses['Food'] || 0) + (metrics.categoryExpenses['Groceries'] || 0);
    return {
      answer: `You spent **₹${foodAmt.toLocaleString('en-IN')}** on Food & Groceries this month.`,
      source: 'local_engine',
    };
  }

  if (normalizedQuery.includes('compare') || normalizedQuery.includes('last month')) {
    const changeWord = metrics.momExpenseChange >= 0 ? 'higher' : 'lower';
    return {
      answer: `This month you spent **₹${metrics.thisMonthExpense.toLocaleString('en-IN')}** compared to **₹${metrics.lastMonthExpense.toLocaleString('en-IN')}** last month. That is **${Math.abs(metrics.momExpenseChange)}% ${changeWord}** month-over-month.`,
      source: 'local_engine',
    };
  }

  // Default helpful overview
  return {
    answer: `Here is your current snapshot, ${userName}:\n• **Monthly Income:** ₹${metrics.thisMonthIncome.toLocaleString('en-IN')}\n• **Monthly Expenses:** ₹${metrics.thisMonthExpense.toLocaleString('en-IN')}\n• **Money Owed to You:** ₹${metrics.totalReceivable.toLocaleString('en-IN')}\n• **Money You Owe:** ₹${metrics.totalPayable.toLocaleString('en-IN')}\n\nYou can ask me specific questions like *"Who owes me the most?"*, *"How much did I spend on food?"*, or *"What was my biggest expense?"*!`,
    source: 'local_engine',
  };
};

module.exports = {
  computeFinancialMetrics,
  generateFinancialSummary,
  answerFinancialQuery,
};
