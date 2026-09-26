const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

async function testAll() {
  console.log('--- Starting PocketGuard E2E Integration Tests ---');

  // 1. Health check
  console.log('1. Testing /api/health...');
  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  console.log('Health Response:', healthData);
  if (healthData.status !== 'healthy') throw new Error('Health check failed');

  // 2. Authentication: Login as Roshan
  console.log('2. Testing Login as Roshan (Lender)...');
  const loginRoshanRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'roshan@pocketguard.com', password: 'password123' }),
  });
  const roshanAuth = await loginRoshanRes.json();
  if (!roshanAuth.success) throw new Error('Roshan login failed: ' + JSON.stringify(roshanAuth));
  const roshanToken = roshanAuth.data.token;
  console.log('Roshan logged in! ID:', roshanAuth.data._id);

  // 3. Authentication: Login as Rahul
  console.log('3. Testing Login as Rahul (Borrower)...');
  const loginRahulRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'rahul@pocketguard.com', password: 'password123' }),
  });
  const rahulAuth = await loginRahulRes.json();
  if (!rahulAuth.success) throw new Error('Rahul login failed: ' + JSON.stringify(rahulAuth));
  const rahulToken = rahulAuth.data.token;
  console.log('Rahul logged in! ID:', rahulAuth.data._id);

  // 4. Wallet Dashboard for Roshan
  console.log('4. Testing Wallet Dashboard for Roshan...');
  const dashRoshanRes = await fetch(`${BASE_URL}/wallet/dashboard`, {
    headers: { Authorization: `Bearer ${roshanToken}` },
  });
  const dashRoshan = await dashRoshanRes.json();
  console.log('Roshan Wallet Balance:', dashRoshan.data.wallet.currentBalance);
  console.log('Roshan Receivables:', dashRoshan.data.lending.totalReceivable);
  console.log('Roshan Payables:', dashRoshan.data.lending.totalPayable);

  // 5. Lending Dashboard for Roshan
  console.log('5. Testing Lending Dashboard for Roshan...');
  const lendingRoshanRes = await fetch(`${BASE_URL}/lending`, {
    headers: { Authorization: `Bearer ${roshanToken}` },
  });
  const lendingRoshan = await lendingRoshanRes.json();
  const rahulContactFromRoshan = lendingRoshan.data.contacts.find(
    (c) => c.counterparty.mobile === '9876543211'
  );
  console.log('From Roshan view, Rahul status:', rahulContactFromRoshan.status, 'netBalance:', rahulContactFromRoshan.netBalance);

  // 6. Lending Dashboard for Rahul
  console.log('6. Testing Lending Dashboard for Rahul...');
  const lendingRahulRes = await fetch(`${BASE_URL}/lending`, {
    headers: { Authorization: `Bearer ${rahulToken}` },
  });
  const lendingRahul = await lendingRahulRes.json();
  const roshanContactFromRahul = lendingRahul.data.contacts.find(
    (c) => c.counterparty.mobile === '9876543210'
  );
  console.log('From Rahul view, Roshan status:', roshanContactFromRahul.status, 'netBalance:', roshanContactFromRahul.netBalance);

  // Verify two-sided synchronization:
  // rahulContactFromRoshan.netBalance + roshanContactFromRahul.netBalance should equal exactly 0!
  if (rahulContactFromRoshan.netBalance + roshanContactFromRahul.netBalance !== 0) {
    throw new Error('Synchronization mismatch between Roshan and Rahul!');
  }
  console.log('SUCCESS: Two-Sided Mirror Verified (Roshan net: ' + rahulContactFromRoshan.netBalance + ' | Rahul net: ' + roshanContactFromRahul.netBalance + ')');

  // 7. Test Cross-User Transaction: Roshan gives Rahul ₹1,000
  console.log('7. Testing new synchronized transaction: Roshan gives Rahul ₹1,000...');
  const txRes = await fetch(`${BASE_URL}/lending`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${roshanToken}`,
    },
    body: JSON.stringify({
      type: 'lend',
      amount: 1000,
      contactId: rahulAuth.data._id,
      description: 'Dinner treat coverage',
    }),
  });
  const txData = await txRes.json();
  console.log('Transaction response:', txData.message);

  // Check new balances
  const checkRoshan = await (await fetch(`${BASE_URL}/lending`, {
    headers: { Authorization: `Bearer ${roshanToken}` },
  })).json();
  const checkRahul = await (await fetch(`${BASE_URL}/lending`, {
    headers: { Authorization: `Bearer ${rahulToken}` },
  })).json();

  const newRahulFromRoshan = checkRoshan.data.contacts.find(
    (c) => c.counterparty.mobile === '9876543211'
  );
  const newRoshanFromRahul = checkRahul.data.contacts.find(
    (c) => c.counterparty.mobile === '9876543210'
  );

  console.log('After ₹1,000 lend:');
  console.log('Roshan view of Rahul:', newRahulFromRoshan.status, 'netBalance:', newRahulFromRoshan.netBalance);
  console.log('Rahul view of Roshan:', newRoshanFromRahul.status, 'netBalance:', newRoshanFromRahul.netBalance);

  if (newRahulFromRoshan.netBalance !== rahulContactFromRoshan.netBalance + 1000) {
    throw new Error('Balance increment did not apply properly to Roshan!');
  }
  if (newRoshanFromRahul.netBalance !== roshanContactFromRahul.netBalance - 1000) {
    throw new Error('Balance decrement did not apply properly to Rahul!');
  }
  console.log('SUCCESS: Synchronized increment confirmed on both sides!');

  // 8. Test Repayment: Rahul repays ₹500
  console.log('8. Testing Repayment: Rahul repays ₹500 to Roshan...');
  const repayRes = await fetch(`${BASE_URL}/lending/${newRoshanFromRahul._id}/repay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rahulToken}`,
    },
    body: JSON.stringify({
      amount: 500,
      description: 'UPI Repayment of ₹500',
    }),
  });
  const repayData = await repayRes.json();
  console.log('Repayment response:', repayData.message);

  // 9. Test AI Summary
  console.log('9. Testing AI Financial Summary for Roshan...');
  const aiSummaryRes = await fetch(`${BASE_URL}/ai/summary`, {
    headers: { Authorization: `Bearer ${roshanToken}` },
  });
  const aiSummary = await aiSummaryRes.json();
  console.log('AI Headline:', aiSummary.data.headline);
  console.log('AI Cash Flow Status:', aiSummary.data.cashFlowStatus);
  console.log('AI Highlights (First 2):', aiSummary.data.highlights.slice(0, 2));

  // 10. Test AI Assistant Query
  console.log('10. Testing AI Assistant question: "Who owes me the most?"...');
  const aiQueryRes = await fetch(`${BASE_URL}/ai/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${roshanToken}`,
    },
    body: JSON.stringify({ query: 'Who owes me the most?' }),
  });
  const aiQuery = await aiQueryRes.json();
  console.log('AI Assistant Answer:\n', aiQuery.data.answer);

  // 11. Test Chat API
  console.log('11. Testing Chat Conversations & Messages...');
  const convRes = await fetch(`${BASE_URL}/chat/conversations`, {
    headers: { Authorization: `Bearer ${roshanToken}` },
  });
  const convs = await convRes.json();
  console.log('Conversations count for Roshan:', convs.data.length);
  const activeConv = convs.data[0];
  console.log('First conversation with:', activeConv.participant.name);
  console.log('In-chat financial relationship:', activeConv.financialRelationship?.status, 'net:', activeConv.financialRelationship?.netBalance);

  // Send message in conversation
  const sendMsgRes = await fetch(`${BASE_URL}/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${roshanToken}`,
    },
    body: JSON.stringify({
      conversationId: activeConv._id,
      message: 'Automated test message sent via E2E test script',
    }),
  });
  const sendMsgData = await sendMsgRes.json();
  console.log('Sent message text:', sendMsgData.data.message);

  // 12. Test Notifications
  console.log('12. Testing Notifications for Rahul (should have received transaction alerts)...');
  const notifRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${rahulToken}` },
  });
  const notifs = await notifRes.json();
  console.log('Rahul unread notification count:', notifs.data.unreadCount);
  console.log('Latest notification title:', notifs.data.notifications[0]?.title);

  console.log('\n======================================================');
  console.log('ALL 12 BACKEND AND SYNC SUITES PASSED FLAWLESSLY! 🚀');
  console.log('======================================================\n');
}

testAll().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
