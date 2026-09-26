# 🛡️ PocketGuard — Full-Stack Personal Wallet & Synchronized Lending Platform

**PocketGuard** is a production-grade full-stack MERN (MongoDB, Express, React, Node.js) fintech web application designed for personal wallet management, **two-sided synchronized money lending/borrowing**, real-time peer-to-peer chat via **Socket.IO** with embedded financial relationship summaries, and **AI-powered financial analytics & conversational assistance**.

---

## 🌟 Key Highlights & Features

### 1. 💼 Personal Wallet Management
* **Income & Expense Tracking:** Add income (Salary, Freelance, Investment, Gifts) and track expenses (Food, Groceries, Rent/Bills, Shopping, Transport, Entertainment).
* **Manual Balance Adjustments:** Add, subtract, or set exact wallet balances with automatic audit log creation.
* **Cash Flow Visualizations:** Interactive Recharts bar charts showing 6-month Income vs. Expense cash flow.
* **Expense Breakdown:** Donut/Pie charts categorizing monthly expenditures.

### 2. 🤝 Two-Sided Synchronized Lending Ledger (Zero Duplication)
* **Single Source of Truth:** Counterparty lending is tracked using canonical mathematical relationships (`userA` < `userB`).
* **Mirrored Ledgers:**
  * When **User A** records ₹2,000 given to **User B**:
    * User A sees: *"Rahul owes you ₹2,000"* (Net: +₹2,000)
    * User B sees: *"You owe Roshan ₹2,000"* (Net: -₹2,000)
  * When **User B** repays ₹500:
    * User B sees: *"You paid ₹500 | Remaining debt ₹1,500"*
    * User A sees: *"Received ₹500 | Remaining Rahul owes you ₹1,500"*
* **Overpayment Edge-Case Handling:** If a repayment exceeds outstanding debt, the system seamlessly flips the balance into credit without corrupting state.
* **External Contact Support:** Lend/borrow with unregistered external people via Name and Phone number.

### 3. 💬 Real-Time Chat with Embedded Financial Relationship
* **Socket.IO Powered:** Instant messaging, typing indicators, read receipts, and live online/offline presence indicators.
* **In-Chat Financial Relationship Panel:** While chatting with another user, an interactive top bar displays:
  * *You gave Rahul: ₹5,000*
  * *Rahul returned: ₹2,000*
  * *Remaining: Rahul owes you ₹3,000*
  * Direct action buttons inside the chat: **[+ Give Money]**, **[Receive Money]**, **[Settle Up]**.
* **Automatic Financial Event Cards:** Lending and repayment actions post formatted event cards into the chat stream in real time.

### 4. 🤖 AI Financial Analysis & Conversational Assistant
* **Modular AI Engine:** Supports Gemini API / OpenAI keys with an intelligent, deterministic local analytical engine fallback when offline or without external API keys.
* **Executive Financial Summary:** Computes month-over-month expense change, top spending categories, risk assessment of outstanding receivables, and actionable saving suggestions.
* **Conversational Financial Assistant:** Ask questions in plain English:
  * *"How much did I spend this month?"*
  * *"Who owes me the most?"*
  * *"How much money do I currently owe?"*
  * *"What was my biggest expense?"*
  * *"How much did I spend on food this month?"*
  * *"Compare my spending with last month."*

### 5. 🔔 Real-Time Notifications
* Real-time notifications for lending transactions, repayments, chat messages, and monthly AI summaries delivered via Socket.IO without page refresh.

---

## 🛠️ Tech Stack

### Frontend
* **React 18** (Hooks, Context API)
* **Vite** (Ultra-fast build tool)
* **Tailwind CSS** (Custom fintech emerald/navy dark & light mode)
* **React Router v6** (Protected & Public routing guards)
* **Recharts** (Cash flow bar charts, category breakdown donut charts)
* **Socket.IO Client** (Live duplex communication)
* **Axios** (JWT interceptors & centralized error handling)
* **Lucide React** (Modern fintech icons)

### Backend
* **Node.js & Express.js**
* **MongoDB & Mongoose** (Canonical relational modeling & indexes)
* **Socket.IO Server** (Room management, presence tracking, events)
* **JSON Web Tokens (JWT)** & **bcryptjs** (Secure authentication & password hashing)
* **dotenv & cors & morgan**

---

## 📁 Project Architecture

```text
PocketGuard/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Navbar, Sidebar, MobileNav, Modal, Badge, Toast
│   │   │   ├── dashboard/     # StatCard, CashFlowChart, CategoryChart, RecentTransactionsTable
│   │   │   ├── lending/       # LendingSummaryCards, ContactLendingCard, RepayModal
│   │   │   ├── transactions/  # AddTransactionModal, TransactionFilterBar
│   │   │   └── chat/          # ChatSidebar, ChatWindow, FinancialSummaryBar, MessageBubble
│   │   ├── context/           # AuthContext, SocketContext, ThemeContext
│   │   ├── layouts/           # MainLayout, AuthLayout
│   │   ├── pages/             # Dashboard, Wallet, Lending, Transactions, Chat, AI, Profile, Login, Register
│   │   ├── services/          # api.js, authService, walletService, lendingService, chatService, aiService
│   │   ├── utils/             # formatters.js (INR currency, dates, initials)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── server/
│   ├── controllers/           # auth, wallet, lending, transaction, chat, ai, notification
│   ├── models/                # User, Transaction, LendingRelationship, Conversation, Message, Notification
│   ├── routes/                # Express API routes
│   ├── middleware/            # auth.js (JWT verification), error.js (Centralized handler)
│   ├── services/              # aiService.js (Modular Gemini + Local deterministic engine)
│   ├── sockets/               # socketManager.js (Presence, rooms, event emitters)
│   ├── utils/                 # seed.js (Database seeder)
│   ├── test_e2e.js            # Automated integration & synchronization test suite
│   ├── server.js              # Server entry point
│   ├── .env
│   └── package.json
│
├── .env.example
├── README.md
└── package.json
```

---

## 💾 Database Schema

### User
```javascript
{
  name: String,
  email: { type: String, unique: true },
  mobile: { type: String, unique: true },
  password: String (hashed with bcrypt),
  profileImage: String,
  walletBalance: Number,
  createdAt, updatedAt
}
```

### LendingRelationship (Single Source of Truth)
```javascript
{
  userA: ObjectId -> ref User,
  userB: ObjectId -> ref User (null if external),
  isExternal: Boolean,
  externalContact: { name: String, mobile: String },
  balance: Number,          // Positive: userB owes userA | Negative: userA owes userB
  totalGivenByA: Number,    // Total amount userA lent
  totalGivenByB: Number,    // Total amount userB lent / repaid
  lastTransactionAt: Date
}
```

### Transaction
```javascript
{
  type: 'income' | 'expense' | 'lend' | 'borrow' | 'repayment',
  amount: Number,
  category: String,
  description: String,
  sender: ObjectId -> ref User,
  receiver: ObjectId -> ref User,
  createdBy: ObjectId -> ref User,
  lendingRelationship: ObjectId -> ref LendingRelationship,
  isExternal: Boolean,
  externalContact: { name, mobile },
  status: 'completed' | 'pending' | 'cancelled',
  date: Date
}
```

### Conversation & Message
```javascript
Conversation: {
  participants: [ObjectId -> ref User],
  lastMessage: ObjectId -> ref Message,
  lendingRelationship: ObjectId -> ref LendingRelationship
}

Message: {
  conversation: ObjectId -> ref Conversation,
  sender: ObjectId -> ref User,
  receiver: ObjectId -> ref User,
  message: String,
  read: Boolean,
  type: 'text' | 'transaction_alert' | 'system',
  metadata: Object
}
```

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
* **Node.js** >= 18.x
* **MongoDB** running locally on port `27017` (or MongoDB Atlas URI)

### 2. Install Dependencies
Run from the root directory:
```bash
npm run install-all
```
*(Or run `npm install` inside both `server/` and `client/` directories)*

### 3. Environment Variables
Create `server/.env` (an example is provided in `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pocketguard
JWT_SECRET=pocketguard_super_secret_jwt_key_2026_production
CLIENT_URL=http://localhost:5173
AI_API_KEY=
```
> **Note on AI:** If `AI_API_KEY` is left blank, PocketGuard automatically uses its built-in analytical engine to compute 100% accurate financial metrics and handle AI chat queries!

### 4. Seed the Database
Populate demo users, transactions, relationships, and chat history:
```bash
npm run seed
```

### 5. Start the Application
Run both backend and frontend concurrently:
```bash
npm run dev
```

* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:5000/api`
* **Health Check:** `http://localhost:5000/api/health`

---

## 👥 Demo Accounts (Click-to-Autofill on Login Screen)

All accounts use the password: `password123`

| Name | Email | Mobile | Role / Scenario |
| :--- | :--- | :--- | :--- |
| **Roshan Kumar** | `roshan@pocketguard.com` | `9876543210` | Primary lender (Wallet: ₹42,700, ₹6,200 pending collection) |
| **Rahul Sharma** | `rahul@pocketguard.com` | `9876543211` | Borrower (Owes Roshan ₹3,000) |
| **Aman Verma** | `aman@pocketguard.com` | `9876543212` | Borrower (Owes Roshan ₹2,000 for concert tickets) |
| **Priya Patel** | `priya@pocketguard.com` | `9876543213` | Lender (Roshan owes Priya ₹1,500 for dinner bill split) |

---

## 🧪 Automated Testing

PocketGuard includes an end-to-end test suite testing all 12 core functional areas:
```bash
node server/test_e2e.js
```
**Tests verified:**
1. API Health Check
2. Authentication & JWT issuance
3. Wallet Balance calculations
4. Two-sided canonical Lending mirroring
5. Real-time balance increments & decrements
6. Cross-user repayments
7. AI Financial Executive Summary generation
8. Conversational AI natural-language assistant
9. Socket.IO chat messaging & conversation retrieval
10. Unread notification delivery

---

## 📡 REST API Documentation

### Auth
* `POST /api/auth/register` — Register new user
* `POST /api/auth/login` — Login with email or mobile
* `GET  /api/auth/me` — Get authenticated user profile
* `PUT  /api/auth/profile` — Update name or avatar
* `GET  /api/auth/users/search?query=...` — Search registered users by name/phone

### Wallet & Transactions
* `GET  /api/wallet/dashboard` — Complete wallet metrics, cash flow, category breakdown
* `POST /api/wallet/adjust` — Manual balance adjustment (`add`, `subtract`, `set`)
* `GET  /api/transactions` — Filtered & sorted transaction history
* `POST /api/transactions` — Add Income or Expense
* `DELETE /api/transactions/:id` — Delete transaction with balance rollback

### Lending & Borrowing
* `GET  /api/lending` — Lending dashboard totals & contacts list
* `POST /api/lending` — Record lending, borrowing, or repayment
* `POST /api/lending/:id/repay` — Quick settlement/repayment
* `GET  /api/lending/:id` — Relationship details & bilateral ledger

### Live Chat & Socket.IO
* `GET  /api/chat/conversations` — List conversations with unread counts & financial relationship
* `POST /api/chat/conversations` — Start/find conversation with user
* `GET  /api/chat/messages/:conversationId` — Fetch chat history
* `POST /api/chat/messages` — Send message

### AI Intelligence
* `GET  /api/ai/summary` — Structured executive summary & risk insights
* `POST /api/ai/query` — Natural language financial query assistant

### Notifications
* `GET  /api/notifications` — Fetch user notifications
* `PUT  /api/notifications/:id/read` — Mark single notification as read
* `PUT  /api/notifications/read-all` — Mark all as read
* `DELETE /api/notifications/clear` — Clear read notifications

---

## 🔒 Security & Data Integrity

1. **Authorization Verification:** Every API endpoint validates JWT ownership. A user cannot access or modify another user's financial relationships.
2. **Preventing Duplicate States:** Lending pairs use canonical sorted IDs (`[userA, userB].sort()`) so only one canonical record exists per user pair.
3. **Password Security:** Passwords hashed with bcrypt (salt rounds: 10) and excluded from JSON responses.
4. **Data Privacy:** Only relevant aggregated numerical figures are fed to the AI engine; sensitive passwords and auth tokens are never exposed.

---

## 📄 License
ISC License. Built for full-stack excellence.
