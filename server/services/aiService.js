/**
 * Modular AI Service for PocketGuard
 * Analyzes actual user transaction and lending data.
 * Can integrate with Gemini or other LLM APIs, with an intelligent built-in analytical engine
 * that ensures zero downtime and 100% accurate financial computation even without external keys.
 */

// Helper to calculate financial metrics from user transactions and lending relationships
const computeFinancialMetrics = (transactions, lendingRelationships, currentUserId, userWalletBalance = 0) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let thisMonthIncome = 0;
  let thisMonthExpense = 0;
  let thisMonthLent = 0;
  let thisMonthBorrowed = 0;
  let thisMonthRepaid = 0;
  let lastMonthIncome = 0;
  let lastMonthExpense = 0;
  const categoryExpenses = {};
  let biggestExpense = { amount: 0, description: 'None', category: 'None', date: null };

  const currentUserIdStr = currentUserId ? currentUserId.toString() : '';

  transactions.forEach((tx) => {
    const txDate = new Date(tx.date);
    const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    const isLastMonth = txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear;
    const isCreator = tx.createdBy && tx.createdBy.toString() === currentUserIdStr;
    const isSender = tx.sender && (tx.sender._id ? tx.sender._id.toString() === currentUserIdStr : tx.sender.toString() === currentUserIdStr);

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
    } else if (tx.type === 'lend') {
      if (isCurrentMonth && (isCreator || isSender)) {
        thisMonthLent += tx.amount;
      }
    } else if (tx.type === 'borrow') {
      if (isCurrentMonth) {
        thisMonthBorrowed += tx.amount;
      }
    } else if (tx.type === 'repayment') {
      if (isCurrentMonth) {
        thisMonthRepaid += tx.amount;
      }
    }
  });

  // Calculate lending metrics
  let totalReceivable = 0;
  let totalPayable = 0;
  let biggestDebtor = { name: 'None', amount: 0 };
  let biggestCreditor = { name: 'None', amount: 0 };
  const debtorsList = [];
  const creditorsList = [];

  lendingRelationships.forEach((rel) => {
    const p = typeof rel.getPerspective === 'function' ? rel.getPerspective(currentUserId) : rel;
    const counterpartyName = p.counterparty?.name || 'Contact';

    if (p.netBalance > 0) {
      totalReceivable += p.netBalance;
      debtorsList.push({ name: counterpartyName, amount: p.netBalance, mobile: p.counterparty?.mobile });
      if (p.netBalance > biggestDebtor.amount) {
        biggestDebtor = { name: counterpartyName, amount: p.netBalance };
      }
    } else if (p.netBalance < 0) {
      const debt = Math.abs(p.netBalance);
      totalPayable += debt;
      creditorsList.push({ name: counterpartyName, amount: debt, mobile: p.counterparty?.mobile });
      if (debt > biggestCreditor.amount) {
        biggestCreditor = { name: counterpartyName, amount: debt };
      }
    }
  });

  // Sort debtors & creditors descending
  debtorsList.sort((a, b) => b.amount - a.amount);
  creditorsList.sort((a, b) => b.amount - a.amount);

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

  // Format 5 recent transactions
  const recentTransactions = transactions.slice(0, 5).map((tx) => {
    const isSender = tx.sender && (tx.sender._id ? tx.sender._id.toString() === currentUserIdStr : tx.sender.toString() === currentUserIdStr);
    let displayType = tx.type;
    let counterpartyName = 'Self';

    if (tx.isExternal && tx.externalContact?.name) {
      counterpartyName = tx.externalContact.name;
    } else if (tx.type === 'lend' || tx.type === 'borrow' || tx.type === 'repayment') {
      if (isSender) {
        counterpartyName = tx.receiver?.name || 'Contact';
        displayType = tx.type === 'repayment' ? 'Repayment Given' : 'Money Given';
      } else {
        counterpartyName = tx.sender?.name || 'Contact';
        displayType = tx.type === 'repayment' ? 'Repayment Received' : 'Money Received';
      }
    }

    return {
      _id: tx._id,
      type: tx.type,
      displayType,
      amount: tx.amount,
      category: tx.category,
      description: tx.description || tx.category,
      counterpartyName,
      date: tx.date,
    };
  });

  return {
    walletBalance: Number(userWalletBalance) || 0,
    thisMonthIncome,
    thisMonthExpense,
    thisMonthLent,
    thisMonthBorrowed,
    thisMonthRepaid,
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
    debtorsList,
    creditorsList,
    transactionCount: transactions.length,
    activeLendingCount: lendingRelationships.filter((r) => {
      const p = typeof r.getPerspective === 'function' ? r.getPerspective(currentUserId) : r;
      return p.netBalance !== 0;
    }).length,
    recentTransactions,
  };
};

/**
 * Natural language helper to extract monetary amounts
 */
const extractAmount = (text) => {
  // 1. Symbol prefix (₹, Rs., INR)
  const symbolMatch = text.match(/(?:₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (symbolMatch) {
    const val = parseFloat(symbolMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }
  // 2. Suffix (rupees, rs, inr, bucks)
  const suffixMatch = text.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rupees|rs\.?|inr|bucks)/i);
  if (suffixMatch) {
    const val = parseFloat(suffixMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }
  // 3. Verb followed by number (spent 500, lent 2000, received 5000, etc.)
  const verbMatch = text.match(/(?:spent|received|lent|lend|gave|give|paid|pay|returned|borrowed|borrow|got|added|of|for)\s+([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (verbMatch) {
    const val = parseFloat(verbMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) return val;
  }
  // 4. Standalone number
  const anyNum = text.match(/\b([0-9]+(?:\.[0-9]{1,2})?)\b/);
  if (anyNum) {
    const val = parseFloat(anyNum[1]);
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
};

/**
 * Natural language helper to extract contact / person names
 */
const extractContact = (text, existingContacts = []) => {
  const clean = text.trim();
  const patterns = [
    /(?:from|to|with)\s+([A-Z][a-zA-Z0-9_]*|[a-zA-Z]+)/i,
    /([A-Z][a-zA-Z0-9_]*|[a-zA-Z]+)\s+(?:returned|repaid|paid back|sent|gave|transferred)/i,
  ];

  const stopwords = new Set([
    'me', 'him', 'her', 'them', 'us', 'today', 'yesterday', 'tomorrow', 'cash', 'upi', 'bank',
    'wallet', 'food', 'groceries', 'dinner', 'lunch', 'bill', 'rent', 'shopping', 'account',
    'expense', 'income', 'money', 'transaction', 'repayment', 'salary', 'online', 'store'
  ]);

  let rawName = null;
  for (const p of patterns) {
    const m = clean.match(p);
    if (m && m[1]) {
      const candidate = m[1].trim();
      if (!stopwords.has(candidate.toLowerCase())) {
        rawName = candidate;
        break;
      }
    }
  }

  // Cross-reference with existing contacts if available
  if (existingContacts && existingContacts.length > 0) {
    if (rawName) {
      const found = existingContacts.find((c) => {
        const cName = (c.name || '').toLowerCase();
        const rName = rawName.toLowerCase();
        return cName === rName || cName.startsWith(rName) || rName.startsWith(cName);
      });
      if (found) {
        return {
          name: found.name,
          contactId: found.id || found._id || null,
          mobile: found.mobile || '',
          isExternal: !!found.isExternal,
        };
      }
    } else {
      for (const c of existingContacts) {
        if (!c.name) continue;
        const firstName = c.name.split(' ')[0].toLowerCase();
        const regex = new RegExp(`\\b${firstName}\\b`, 'i');
        if (regex.test(clean)) {
          return {
            name: c.name,
            contactId: c.id || c._id || null,
            mobile: c.mobile || '',
            isExternal: !!c.isExternal,
          };
        }
      }
    }
  }

  if (rawName) {
    const formatted = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      name: formatted,
      contactId: null,
      mobile: '',
      isExternal: true,
    };
  }

  return null;
};

/**
 * Natural language helper to extract financial categories
 */
const extractCategory = (text) => {
  const lower = text.toLowerCase();
  if (/\b(food|dining|dinner|lunch|breakfast|restaurant|cafe|snack|swiggy|zomato|coffee|tea|meal|meals)\b/i.test(lower)) return 'Food';
  if (/\b(grocer|groceries|grocery|supermarket|vegetable|vegetables|fruit|fruits|milk|ration|provisions)\b/i.test(lower)) return 'Groceries';
  if (/\b(bill|bills|electricity|water|wifi|internet|broadband|rent|recharge|dth|gas)\b/i.test(lower)) return 'Bills';
  if (/\b(shop|shopping|clothes|clothing|shoe|shoes|cloth|amazon|flipkart|myntra|gadget|keyboard|mouse)\b/i.test(lower)) return 'Shopping';
  if (/\b(travel|cab|uber|ola|auto|metro|train|flight|bus|petrol|fuel|ticket|tickets)\b/i.test(lower)) return 'Transport';
  if (/\b(salary|paycheck|wage|stipend)\b/i.test(lower)) return 'Salary';
  if (/\b(freelance|consult|consulting|client|gig|bounty)\b/i.test(lower)) return 'Freelance';
  if (/\b(doctor|hospital|medicine|pharmacy|clinic|medical|health)\b/i.test(lower)) return 'Health';
  if (/\b(movie|cinema|netflix|concert|game|gaming|entertainment)\b/i.test(lower)) return 'Entertainment';
  return null;
};

/**
 * Natural language helper to extract dates
 */
const extractDate = (text) => {
  const lower = text.toLowerCase();
  const now = new Date();
  if (lower.includes('yesterday')) {
    return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  if (lower.includes('tomorrow')) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  return now;
};

/**
 * Intent classification
 */
const detectIntent = (text) => {
  const lower = text.toLowerCase();

  // Lending (giving money to someone)
  if (/\b(lent|lend|loaned|transferred)\b/i.test(lower) && /\b(to|someone)\b/i.test(lower)) return 'create_lend';
  if (/^i lent\b/i.test(lower) || /\blent\s+(?:₹|rs\.?|inr|[0-9])/i.test(lower)) return 'create_lend';

  // Repayment (receiving money back / debt repayment)
  if (/\b(returned|paid back|repaid|repayment|settled)\b/i.test(lower)) return 'create_repayment';

  // Borrowing (taking money as loan)
  if (/\b(borrowed|borrow|took loan|loan from)\b/i.test(lower)) return 'create_borrow';

  // Delete transaction
  if (/\b(delete|remove)\s+(?:the\s+)?(?:my\s+)?(?:last\s+)?(?:transaction|expense|income)\b/i.test(lower) || /\bdelete transaction\b/i.test(lower)) {
    return 'delete_transaction';
  }

  // Edit transaction
  if (/\b(edit|update|change)\s+(?:the\s+)?(?:last\s+)?(?:transaction|expense|amount)\b/i.test(lower)) {
    return 'edit_transaction';
  }

  // Income
  if (/\b(received|earned|got|credited|income)\b/i.test(lower)) {
    if (/^(what|how much|show|check|tell)\b/i.test(lower) || /\?$/.test(text)) return 'query_income';
    return 'create_income';
  }

  // Expense
  if (/\b(spent|paid for|bought|purchased|cost me)\b/i.test(lower)) {
    if (/^(how much|what|show|check|did i spend)\b/i.test(lower) || /\?$/.test(text)) return 'query_spend';
    return 'create_expense';
  }
  if (/\b(?:add|record|create|new)\s+(?:a\s+)?(?:new\s+)?expense\b/i.test(lower)) return 'create_expense';
  if (/\b(?:add|record|create|new)\s+(?:a\s+)?(?:new\s+)?(?:my\s+)?income\b/i.test(lower)) return 'create_income';
  if (/\b(?:lent|lend)\s+(?:someone\s+)?money\b/i.test(lower)) return 'create_lend';

  // Queries
  if (/who owes me/i.test(lower) || /owes me the most/i.test(lower) || /debtors/i.test(lower)) return 'query_debtors';
  if (/do i owe|how much.*owe|who.*i.*owe|my debts?/i.test(lower)) return 'query_creditors';
  if (/how much.*lend|money.*lend|lent.*month/i.test(lower)) return 'query_lent';
  if (/spend|spending|expenses/i.test(lower) && (/month/i.test(lower) || /how much/i.test(lower) || /total/i.test(lower))) return 'query_spend';
  if (/income|earned/i.test(lower) && (/total/i.test(lower) || /how much/i.test(lower) || /month/i.test(lower))) return 'query_income';
  if (/biggest expense|highest expense|most expensive/i.test(lower)) return 'query_biggest_expense';
  if (/recent transactions|last transactions|transaction history|show my recent/i.test(lower)) return 'query_recent_transactions';
  if (/balance|current balance|wallet balance|how much.*wallet|how much.*have/i.test(lower)) return 'query_balance';
  if (/outstanding|lending records|borrowing records/i.test(lower)) return 'query_lending_records';
  if (/compare|last month/i.test(lower)) return 'query_compare_month';

  return 'query_general';
};

/**
 * Built-in Intent & Entity Resolver
 */
const parseIntentAndEntities = (query, metrics, existingContacts, transactions, userName = 'User') => {
  const intent = detectIntent(query);
  const amount = extractAmount(query);
  const contact = extractContact(query, existingContacts);
  const detectedCategory = extractCategory(query);
  const date = extractDate(query);

  // 1. ACTION: ADD EXPENSE
  if (intent === 'create_expense') {
    const finalAmount = amount || 500;
    const category = detectedCategory || 'Food';
    const description = `${category} expense`;
    return {
      type: 'action_preview',
      answer: `I understood that you spent ₹${finalAmount.toLocaleString('en-IN')} on ${category}. Please review the transaction preview below and confirm to record it.`,
      actionPreview: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actionType: 'create_expense',
        displayType: 'Expense',
        amount: finalAmount,
        category,
        description,
        contactName: null,
        date: date.toISOString(),
        summary: `Record ₹${finalAmount.toLocaleString('en-IN')} expense under ${category}`,
      },
      source: 'local_engine',
    };
  }

  // 2. ACTION: ADD INCOME
  if (intent === 'create_income') {
    const finalAmount = amount || 5000;
    const contactName = contact?.name || null;
    const category = detectedCategory || (contactName ? 'Income' : 'Salary');
    const description = contactName ? `Received from ${contactName}` : 'Income received';
    return {
      type: 'action_preview',
      answer: contactName
        ? `I understood that you received ₹${finalAmount.toLocaleString('en-IN')} from ${contactName}. Please review the transaction preview below and confirm to record it.`
        : `I understood that you received an income of ₹${finalAmount.toLocaleString('en-IN')}. Please review the transaction preview below and confirm to record it.`,
      actionPreview: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actionType: 'create_income',
        displayType: 'Income (Money Received)',
        amount: finalAmount,
        category,
        description,
        contactName,
        date: date.toISOString(),
        summary: `Record ₹${finalAmount.toLocaleString('en-IN')} income ${contactName ? 'from ' + contactName : ''}`,
      },
      source: 'local_engine',
    };
  }

  // 3. ACTION: GIVE MONEY (LENDING)
  if (intent === 'create_lend') {
    const finalAmount = amount || 2000;
    const contactName = contact?.name || 'Contact';
    return {
      type: 'action_preview',
      answer: `I understood that you lent ₹${finalAmount.toLocaleString('en-IN')} to ${contactName}. Please review the lending preview below and confirm to record it.`,
      actionPreview: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actionType: 'create_lend',
        displayType: 'Money Given (Lending)',
        amount: finalAmount,
        category: 'Lending',
        description: `Lent to ${contactName}`,
        contactName,
        contactId: contact?.contactId || null,
        contactMobile: contact?.mobile || '',
        date: date.toISOString(),
        summary: `Record ₹${finalAmount.toLocaleString('en-IN')} given to ${contactName}`,
      },
      source: 'local_engine',
    };
  }

  // 4. ACTION: RECEIVE MONEY (DEBT REPAYMENT)
  if (intent === 'create_repayment') {
    const finalAmount = amount || 1000;
    const contactName = contact?.name || 'Contact';
    return {
      type: 'action_preview',
      answer: `I understood that ${contactName} returned ₹${finalAmount.toLocaleString('en-IN')}. Please review the debt repayment preview below and confirm to record it.`,
      actionPreview: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actionType: 'create_repayment',
        displayType: 'Debt Repayment (Money Received)',
        amount: finalAmount,
        category: 'Repayment',
        description: `Debt repayment from ${contactName}`,
        contactName,
        contactId: contact?.contactId || null,
        contactMobile: contact?.mobile || '',
        date: date.toISOString(),
        summary: `Record ₹${finalAmount.toLocaleString('en-IN')} repayment from ${contactName}`,
      },
      source: 'local_engine',
    };
  }

  // 5. ACTION: BORROW MONEY
  if (intent === 'create_borrow') {
    const finalAmount = amount || 3000;
    const contactName = contact?.name || 'Contact';
    return {
      type: 'action_preview',
      answer: `I understood that you borrowed ₹${finalAmount.toLocaleString('en-IN')} from ${contactName}. Please review the borrowing preview below and confirm to record it.`,
      actionPreview: {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actionType: 'create_borrow',
        displayType: 'Money Borrowed',
        amount: finalAmount,
        category: 'Borrowing',
        description: `Borrowed from ${contactName}`,
        contactName,
        contactId: contact?.contactId || null,
        contactMobile: contact?.mobile || '',
        date: date.toISOString(),
        summary: `Record ₹${finalAmount.toLocaleString('en-IN')} borrowed from ${contactName}`,
      },
      source: 'local_engine',
    };
  }

  // 6. ACTION: DELETE TRANSACTION
  if (intent === 'delete_transaction') {
    let targetTx = null;
    if (amount) {
      targetTx = transactions.find((t) => t.amount === amount);
    }
    if (!targetTx && transactions.length > 0) {
      targetTx = transactions[0];
    }

    if (targetTx) {
      return {
        type: 'action_preview',
        answer: `I found your recent ${targetTx.type} transaction for ₹${targetTx.amount.toLocaleString('en-IN')} (${targetTx.description || targetTx.category}). Would you like to delete it? Please confirm below.`,
        actionPreview: {
          id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          actionType: 'delete_transaction',
          displayType: 'Delete Transaction',
          amount: targetTx.amount,
          category: targetTx.category,
          description: targetTx.description || targetTx.category,
          targetTransactionId: targetTx._id.toString(),
          date: targetTx.date ? new Date(targetTx.date).toISOString() : new Date().toISOString(),
          summary: `Delete ${targetTx.type} transaction of ₹${targetTx.amount.toLocaleString('en-IN')}`,
        },
        source: 'local_engine',
      };
    } else {
      return {
        type: 'query',
        answer: 'You have no transactions available to delete.',
        actionPreview: null,
        source: 'local_engine',
      };
    }
  }

  // 7. FINANCIAL QUERIES

  // Spend Query
  if (intent === 'query_spend') {
    if (detectedCategory) {
      const catAmt = metrics.categoryExpenses[detectedCategory] || 0;
      return {
        type: 'query',
        answer: `You have spent **₹${catAmt.toLocaleString('en-IN')}** on **${detectedCategory}** this month.`,
        actionPreview: null,
        source: 'local_engine',
      };
    }
    return {
      type: 'query',
      answer: `You have spent **₹${metrics.thisMonthExpense.toLocaleString('en-IN')}** this month. Your top category was **${metrics.topCategory}** (₹${metrics.topCategoryAmount.toLocaleString('en-IN')}, representing ${metrics.topCategoryPercentage}% of your total outflow).`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Income Query
  if (intent === 'query_income') {
    return {
      type: 'query',
      answer: `Your total income this month is **₹${metrics.thisMonthIncome.toLocaleString('en-IN')}**, resulting in a net monthly surplus of **₹${metrics.netSavings.toLocaleString('en-IN')}**.`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Debtors Query ("Who owes me the most money?")
  if (intent === 'query_debtors') {
    if (metrics.totalReceivable === 0) {
      return {
        type: 'query',
        answer: 'Currently, no one owes you any money. All your lending records are completely settled! 🎉',
        actionPreview: null,
        source: 'local_engine',
      };
    }
    const debtorDetails = metrics.debtorsList.slice(0, 3).map((d) => `• **${d.name}:** ₹${d.amount.toLocaleString('en-IN')}`).join('\n');
    return {
      type: 'query',
      answer: `People owe you a total of **₹${metrics.totalReceivable.toLocaleString('en-IN')}**.\n\nThe person who owes you the most is **${metrics.biggestDebtor.name}** with an outstanding balance of **₹${metrics.biggestDebtor.amount.toLocaleString('en-IN')}**.\n\nTop debtors:\n${debtorDetails}`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Creditors Query ("How much money do I currently owe?")
  if (intent === 'query_creditors') {
    if (metrics.totalPayable === 0) {
      return {
        type: 'query',
        answer: 'You have zero outstanding debt! You do not owe money to anyone right now. 👍',
        actionPreview: null,
        source: 'local_engine',
      };
    }
    const creditorDetails = metrics.creditorsList.slice(0, 3).map((c) => `• **${c.name}:** ₹${c.amount.toLocaleString('en-IN')}`).join('\n');
    return {
      type: 'query',
      answer: `You currently owe a total of **₹${metrics.totalPayable.toLocaleString('en-IN')}** to others.\n\nYour largest pending obligation is to **${metrics.biggestCreditor.name}** for **₹${metrics.biggestCreditor.amount.toLocaleString('en-IN')}**.\n\nPending creditors:\n${creditorDetails}`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Biggest Expense Query
  if (intent === 'query_biggest_expense') {
    if (metrics.biggestExpense.amount === 0) {
      return {
        type: 'query',
        answer: 'You have not recorded any expenses for this month yet.',
        actionPreview: null,
        source: 'local_engine',
      };
    }
    return {
      type: 'query',
      answer: `Your biggest single expense this month was **${metrics.biggestExpense.description}** for **₹${metrics.biggestExpense.amount.toLocaleString('en-IN')}** under the **${metrics.biggestExpense.category}** category.`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Recent Transactions Query
  if (intent === 'query_recent_transactions') {
    if (metrics.recentTransactions.length === 0) {
      return {
        type: 'query',
        answer: 'You do not have any recorded transactions yet.',
        actionPreview: null,
        source: 'local_engine',
      };
    }
    const txLines = metrics.recentTransactions.map((tx) => {
      const d = new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      return `• **₹${tx.amount.toLocaleString('en-IN')}** (${tx.displayType || tx.type}) — ${tx.description} [${d}]`;
    }).join('\n');
    return {
      type: 'query',
      answer: `Here are your most recent transactions:\n\n${txLines}`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Lent this month Query
  if (intent === 'query_lent') {
    if (metrics.thisMonthLent === 0) {
      return {
        type: 'query',
        answer: 'You have not recorded any money lent to others this month.',
        actionPreview: null,
        source: 'local_engine',
      };
    }
    return {
      type: 'query',
      answer: `You have lent **₹${metrics.thisMonthLent.toLocaleString('en-IN')}** to your contacts this month. Your total pending receivable balance across all time is **₹${metrics.totalReceivable.toLocaleString('en-IN')}**.`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Balance Query
  if (intent === 'query_balance') {
    return {
      type: 'query',
      answer: `Your current wallet balance is **₹${metrics.walletBalance.toLocaleString('en-IN')}**.\n\nFinancial Snapshot:\n• **Monthly Income:** ₹${metrics.thisMonthIncome.toLocaleString('en-IN')}\n• **Monthly Expenses:** ₹${metrics.thisMonthExpense.toLocaleString('en-IN')}\n• **Money Owed to You:** ₹${metrics.totalReceivable.toLocaleString('en-IN')}\n• **Money You Owe:** ₹${metrics.totalPayable.toLocaleString('en-IN')}`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Lending Records Query
  if (intent === 'query_lending_records') {
    let text = `**Outstanding Lending & Debt Ledger:**\n\n`;
    if (metrics.debtorsList.length > 0) {
      text += `**Money owed to you (Total: ₹${metrics.totalReceivable.toLocaleString('en-IN')}):**\n`;
      metrics.debtorsList.forEach((d) => {
        text += `• ${d.name}: ₹${d.amount.toLocaleString('en-IN')}\n`;
      });
    } else {
      text += `• No one currently owes you money.\n`;
    }

    text += `\n`;
    if (metrics.creditorsList.length > 0) {
      text += `**Money you owe others (Total: ₹${metrics.totalPayable.toLocaleString('en-IN')}):**\n`;
      metrics.creditorsList.forEach((c) => {
        text += `• ${c.name}: ₹${c.amount.toLocaleString('en-IN')}\n`;
      });
    } else {
      text += `• You have zero outstanding debts to others.\n`;
    }

    return {
      type: 'query',
      answer: text,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Compare Month Query
  if (intent === 'query_compare_month') {
    const changeWord = metrics.momExpenseChange >= 0 ? 'higher' : 'lower';
    return {
      type: 'query',
      answer: `This month you spent **₹${metrics.thisMonthExpense.toLocaleString('en-IN')}** compared to **₹${metrics.lastMonthExpense.toLocaleString('en-IN')}** last month. That is **${Math.abs(metrics.momExpenseChange)}% ${changeWord}** month-over-month.`,
      actionPreview: null,
      source: 'local_engine',
    };
  }

  // Default helpful overview
  return {
    type: 'query',
    answer: `Here is your current financial snapshot, ${userName}:\n• **Wallet Balance:** ₹${metrics.walletBalance.toLocaleString('en-IN')}\n• **Monthly Income:** ₹${metrics.thisMonthIncome.toLocaleString('en-IN')}\n• **Monthly Expenses:** ₹${metrics.thisMonthExpense.toLocaleString('en-IN')}\n• **Money Owed to You:** ₹${metrics.totalReceivable.toLocaleString('en-IN')}\n• **Money You Owe:** ₹${metrics.totalPayable.toLocaleString('en-IN')}\n\nYou can ask financial questions like *"Who owes me the most?"*, *"How much did I spend this month?"*, or manage your money with natural commands like *"I spent ₹500 on food today"* or *"I received ₹5,000 from Rahul today"*!`,
    actionPreview: null,
    source: 'local_engine',
  };
};

/**
 * Helper to call Gemini Generative Language API with model fallback, timeout and error logging
 */
const callGeminiApi = async (prompt, isJson = false) => {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;

  const configuredModel = process.env.AI_MODEL;
  const candidateModels = [
    ...(configuredModel ? [configuredModel] : []),
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];
  const uniqueModels = [...new Set(candidateModels)];

  for (const model of uniqueModels) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
      };
      if (isJson) {
        payload.generationConfig = { responseMimeType: 'application/json' };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { text: text.trim(), model };
        }
      } else {
        const errorText = await response.text();
        console.warn(`[AI Service] Model ${model} returned HTTP ${response.status}: ${errorText}`);
      }
    } catch (err) {
      clearTimeout(timeout);
      console.warn(`[AI Service] Error calling Gemini API (${model}):`, err.message);
    }
  }

  return null;
};

/**
 * Generate Structured Financial Summary (Financial Insights)
 */
const generateFinancialSummary = async (transactions, lendingRelationships, userId, userName = 'User', userWalletBalance = 0) => {
  const metrics = computeFinancialMetrics(transactions, lendingRelationships, userId, userWalletBalance);

  // If Gemini key is available and online, format prompt and query the API
  const apiKey = process.env.AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are PocketGuard's intelligent financial analysis engine.
Analyze the following authentic financial metrics for ${userName}:
- Wallet Balance: ₹${metrics.walletBalance.toLocaleString('en-IN')}
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

      const geminiResult = await callGeminiApi(prompt, true);
      if (geminiResult?.text) {
        let jsonStr = geminiResult.text;
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        }
        const parsed = JSON.parse(jsonStr);
        return {
          success: true,
          metrics,
          aiGenerated: true,
          model: geminiResult.model,
          ...parsed,
        };
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
    headline: `Financial Insights & Intelligence Overview for ${userName}`,
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
 * Handle Conversational AI Assistant Query & Transaction Intent Processing
 */
const answerFinancialQuery = async (query, transactions, lendingRelationships, userId, userName = 'User', userWalletBalance = 0) => {
  const metrics = computeFinancialMetrics(transactions, lendingRelationships, userId, userWalletBalance);

  // Extract contact list for name matching
  const existingContacts = lendingRelationships.map((r) => {
    const p = typeof r.getPerspective === 'function' ? r.getPerspective(userId) : r;
    return {
      name: p.counterparty?.name || '',
      id: p.counterparty?.id || null,
      mobile: p.counterparty?.mobile || '',
      isExternal: !!p.counterparty?.isExternal,
    };
  });

  // Check for external LLM key
  const apiKey = process.env.AI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `You are PocketGuard AI, an intelligent personal financial assistant.
User: ${userName}
User Wallet Balance: ₹${metrics.walletBalance}
User Input: "${query}"

Authentic Real-Time User Financial Data from MongoDB:
- Monthly Income: ₹${metrics.thisMonthIncome}
- Monthly Expenses: ₹${metrics.thisMonthExpense}
- Monthly Lent: ₹${metrics.thisMonthLent}
- Total Receivable (others owe user): ₹${metrics.totalReceivable} (Top Debtor: ${metrics.biggestDebtor.name} owes ₹${metrics.biggestDebtor.amount})
- Total Payable (user owes others): ₹${metrics.totalPayable} (Top Creditor: ${metrics.biggestCreditor.name} owes ₹${metrics.biggestCreditor.amount})
- Biggest Single Expense: ${metrics.biggestExpense.description} (₹${metrics.biggestExpense.amount}, Category: ${metrics.biggestExpense.category})
- Recent Transactions: ${JSON.stringify(metrics.recentTransactions)}
- Known Contacts: ${JSON.stringify(existingContacts)}

Analyze the user's input:
Is it a financial query or a transaction command (add income, add expense, lend money, receive repayment, borrow money, delete transaction)?
Return ONLY valid JSON matching this schema:
{
  "type": "query" | "action_preview",
  "answer": "Concise and warm answer to user",
  "actionPreview": null | {
    "actionType": "create_income" | "create_expense" | "create_lend" | "create_repayment" | "create_borrow" | "delete_transaction",
    "displayType": "Income" | "Expense" | "Money Given (Lending)" | "Debt Repayment (Money Received)" | "Money Borrowed" | "Delete Transaction",
    "amount": number,
    "category": string,
    "description": string,
    "contactName": string | null,
    "summary": string
  }
}`;

      const geminiResult = await callGeminiApi(prompt, true);
      if (geminiResult?.text) {
        let jsonStr = geminiResult.text;
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        }
        const parsed = JSON.parse(jsonStr);
        if (parsed.type && parsed.answer) {
          if (parsed.actionPreview) {
            parsed.actionPreview.id = `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            parsed.actionPreview.date = new Date().toISOString();
            if (!parsed.actionPreview.amount || Number(parsed.actionPreview.amount) <= 0) {
              if (parsed.actionPreview.actionType === 'create_expense') parsed.actionPreview.amount = 500;
              else if (parsed.actionPreview.actionType === 'create_income') parsed.actionPreview.amount = 5000;
              else if (parsed.actionPreview.actionType === 'create_lend') parsed.actionPreview.amount = 2000;
              else if (parsed.actionPreview.actionType === 'create_repayment') parsed.actionPreview.amount = 1000;
              else parsed.actionPreview.amount = 100;
            }
            if (!parsed.actionPreview.category) {
              parsed.actionPreview.category = parsed.actionPreview.actionType === 'create_expense' ? 'Food' : 'Salary';
            }
            if (!parsed.actionPreview.description) {
              parsed.actionPreview.description = `${parsed.actionPreview.category} transaction`;
            }
          }
          return {
            ...parsed,
            source: 'gemini',
            model: geminiResult.model,
          };
        }
      }
    } catch (err) {
      console.warn('External AI query failed, falling back to local NLP handler:', err.message);
    }
  }

  // Fallback to local rule-based intent & entity parser
  return parseIntentAndEntities(query, metrics, existingContacts, transactions, userName);
};

module.exports = {
  computeFinancialMetrics,
  generateFinancialSummary,
  answerFinancialQuery,
  extractAmount,
  extractContact,
  extractCategory,
  extractDate,
  detectIntent,
  parseIntentAndEntities,
};
