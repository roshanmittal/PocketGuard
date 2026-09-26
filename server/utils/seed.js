const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const LendingRelationship = require('../models/LendingRelationship');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

dotenv.config({ path: __dirname + '/../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pocketguard';

const seedDatabase = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected! Purging old demo data...');

    await User.deleteMany({});
    await Transaction.deleteMany({});
    await LendingRelationship.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});

    console.log('Creating demo users...');

    // Users
    const roshan = await User.create({
      name: 'Roshan Kumar',
      email: 'roshan@pocketguard.com',
      mobile: '9876543210',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
      walletBalance: 42700,
    });

    const rahul = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@pocketguard.com',
      mobile: '9876543211',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
      walletBalance: 24500,
    });

    const aman = await User.create({
      name: 'Aman Verma',
      email: 'aman@pocketguard.com',
      mobile: '9876543212',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
      walletBalance: 18200,
    });

    const priya = await User.create({
      name: 'Priya Patel',
      email: 'priya@pocketguard.com',
      mobile: '9876543213',
      password: 'password123',
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      walletBalance: 53100,
    });

    console.log('Created 4 registered users: Roshan, Rahul, Aman, Priya');

    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    // 1. Personal Wallet Transactions for Roshan
    console.log('Seeding Roshan personal wallet transactions...');
    await Transaction.create([
      {
        type: 'income',
        amount: 65000,
        category: 'Salary',
        description: 'Monthly Tech Salary - Software Eng',
        createdBy: roshan._id,
        date: daysAgo(20),
        status: 'completed',
      },
      {
        type: 'income',
        amount: 15000,
        category: 'Freelance',
        description: 'Fintech Mobile UI Consultation',
        createdBy: roshan._id,
        date: daysAgo(10),
        status: 'completed',
      },
      {
        type: 'expense',
        amount: 18000,
        category: 'Bills',
        description: 'Apartment Monthly Rent',
        createdBy: roshan._id,
        date: daysAgo(19),
        status: 'completed',
      },
      {
        type: 'expense',
        amount: 6500,
        category: 'Groceries',
        description: 'Supermarket monthly groceries & supplies',
        createdBy: roshan._id,
        date: daysAgo(14),
        status: 'completed',
      },
      {
        type: 'expense',
        amount: 3200,
        category: 'Food',
        description: 'Weekend dinner with colleagues',
        createdBy: roshan._id,
        date: daysAgo(7),
        status: 'completed',
      },
      {
        type: 'expense',
        amount: 2100,
        category: 'Bills',
        description: 'High-speed Fiber & Electricity Bill',
        createdBy: roshan._id,
        date: daysAgo(5),
        status: 'completed',
      },
      {
        type: 'expense',
        amount: 4500,
        category: 'Shopping',
        description: 'Ergonomic keyboard and desk mat',
        createdBy: roshan._id,
        date: daysAgo(3),
        status: 'completed',
      },
    ]);

    // 2. Canonical Lending Relationships
    console.log('Creating Lending Relationships & synchronized cross-user records...');

    // Relationship 1: Roshan and Rahul
    // Canonical order: [roshan._id, rahul._id].sort()
    const [uRR1, uRR2] = [roshan._id.toString(), rahul._id.toString()].sort();
    const isRoshanUserA = uRR1 === roshan._id.toString();

    // Roshan gave Rahul ₹5,000, then Rahul repaid ₹2,000 => Remaining: Rahul owes Roshan ₹3,000
    // If Roshan is userA: balance = +3,000 (totalGivenByA = 5000, totalGivenByB = 2000)
    // If Roshan is userB: balance = -3,000 (totalGivenByB = 5000, totalGivenByA = 2000)
    const roshanRahulRel = await LendingRelationship.create({
      userA: uRR1,
      userB: uRR2,
      balance: isRoshanUserA ? 3000 : -3000,
      totalGivenByA: isRoshanUserA ? 5000 : 2000,
      totalGivenByB: isRoshanUserA ? 2000 : 5000,
      isExternal: false,
      lastTransactionAt: daysAgo(2),
    });

    // Transactions between Roshan and Rahul
    await Transaction.create([
      {
        type: 'lend',
        amount: 5000,
        description: 'Lent money for laptop repair',
        category: 'Lending',
        sender: roshan._id,
        receiver: rahul._id,
        createdBy: roshan._id,
        lendingRelationship: roshanRahulRel._id,
        date: daysAgo(12),
        status: 'completed',
      },
      {
        type: 'repayment',
        amount: 2000,
        description: 'Partial repayment via UPI',
        category: 'Repayment',
        sender: rahul._id,
        receiver: roshan._id,
        createdBy: rahul._id,
        lendingRelationship: roshanRahulRel._id,
        date: daysAgo(2),
        status: 'completed',
      },
    ]);

    // Relationship 2: Roshan and Aman
    // Roshan gave Aman ₹2,000, Aman returned 0 => Aman owes Roshan ₹2,000
    const [uRA1, uRA2] = [roshan._id.toString(), aman._id.toString()].sort();
    const isRoshanUserA_Aman = uRA1 === roshan._id.toString();

    const roshanAmanRel = await LendingRelationship.create({
      userA: uRA1,
      userB: uRA2,
      balance: isRoshanUserA_Aman ? 2000 : -2000,
      totalGivenByA: isRoshanUserA_Aman ? 2000 : 0,
      totalGivenByB: isRoshanUserA_Aman ? 0 : 2000,
      isExternal: false,
      lastTransactionAt: daysAgo(8),
    });

    await Transaction.create({
      type: 'lend',
      amount: 2000,
      description: 'Concert ticket advance',
      category: 'Lending',
      sender: roshan._id,
      receiver: aman._id,
      createdBy: roshan._id,
      lendingRelationship: roshanAmanRel._id,
      date: daysAgo(8),
      status: 'completed',
    });

    // Relationship 3: Priya and Roshan
    // Priya gave Roshan ₹1,500 for group lunch => Roshan owes Priya ₹1,500
    const [uPR1, uPR2] = [priya._id.toString(), roshan._id.toString()].sort();
    const isPriyaUserA = uPR1 === priya._id.toString();

    const priyaRoshanRel = await LendingRelationship.create({
      userA: uPR1,
      userB: uPR2,
      balance: isPriyaUserA ? 1500 : -1500,
      totalGivenByA: isPriyaUserA ? 1500 : 0,
      totalGivenByB: isPriyaUserA ? 0 : 1500,
      isExternal: false,
      lastTransactionAt: daysAgo(4),
    });

    await Transaction.create({
      type: 'lend',
      amount: 1500,
      description: 'Group dinner bill split coverage',
      category: 'Lending',
      sender: priya._id,
      receiver: roshan._id,
      createdBy: priya._id,
      lendingRelationship: priyaRoshanRel._id,
      date: daysAgo(4),
      status: 'completed',
    });

    // Relationship 4: External Contact for Roshan (Karan Uncle)
    const externalRel = await LendingRelationship.create({
      userA: roshan._id,
      userB: null,
      isExternal: true,
      externalContact: {
        name: 'Karan Uncle',
        mobile: '9988776655',
      },
      balance: 1200,
      totalGivenByA: 1200,
      totalGivenByB: 0,
      lastTransactionAt: daysAgo(15),
    });

    await Transaction.create({
      type: 'lend',
      amount: 1200,
      description: 'Medicine purchase reimbursement pending',
      category: 'Lending',
      sender: roshan._id,
      receiver: null,
      createdBy: roshan._id,
      lendingRelationship: externalRel._id,
      isExternal: true,
      externalContact: {
        name: 'Karan Uncle',
        mobile: '9988776655',
      },
      date: daysAgo(15),
      status: 'completed',
    });

    console.log('Created relationships and lending transactions.');

    // 3. Conversations & Messages
    console.log('Seeding Chat Conversations & Messages...');

    // Conversation Roshan <-> Rahul
    const convRoshanRahul = await Conversation.create({
      participants: [roshan._id, rahul._id],
      lendingRelationship: roshanRahulRel._id,
    });

    const msg1 = await Message.create({
      conversation: convRoshanRahul._id,
      sender: roshan._id,
      receiver: rahul._id,
      message: 'Hey Rahul, I transferred ₹5,000 for your laptop repair.',
      createdAt: daysAgo(12),
      read: true,
    });

    const msg2 = await Message.create({
      conversation: convRoshanRahul._id,
      sender: rahul._id,
      receiver: roshan._id,
      message: 'Thanks a lot Roshan! Received it. I will start returning it soon.',
      createdAt: daysAgo(11),
      read: true,
    });

    const msg3 = await Message.create({
      conversation: convRoshanRahul._id,
      sender: rahul._id,
      receiver: roshan._id,
      message: 'Hey, I just sent ₹2,000 back to you via UPI!',
      createdAt: daysAgo(2),
      read: true,
    });

    const msg4 = await Message.create({
      conversation: convRoshanRahul._id,
      sender: roshan._id,
      receiver: rahul._id,
      message: 'Got it, thank you! PocketGuard shows remaining ₹3,000.',
      createdAt: daysAgo(2),
      read: true,
    });

    const msg5 = await Message.create({
      conversation: convRoshanRahul._id,
      sender: rahul._id,
      receiver: roshan._id,
      message: "Hey, I'll return the remaining ₹3,000 by this Friday!",
      createdAt: daysAgo(1),
      read: false,
    });

    convRoshanRahul.lastMessage = msg5._id;
    await convRoshanRahul.save();

    // Conversation Roshan <-> Priya
    const convRoshanPriya = await Conversation.create({
      participants: [roshan._id, priya._id],
      lendingRelationship: priyaRoshanRel._id,
    });

    const pMsg1 = await Message.create({
      conversation: convRoshanPriya._id,
      sender: priya._id,
      receiver: roshan._id,
      message: 'Hi Roshan! I covered the dinner bill (₹1,500 was your share).',
      createdAt: daysAgo(4),
      read: true,
    });

    const pMsg2 = await Message.create({
      conversation: convRoshanPriya._id,
      sender: roshan._id,
      receiver: priya._id,
      message: "Noted Priya! I'll settle it up by tonight 👍",
      createdAt: daysAgo(3),
      read: true,
    });

    convRoshanPriya.lastMessage = pMsg2._id;
    await convRoshanPriya.save();

    // Conversation Roshan <-> Aman
    const convRoshanAman = await Conversation.create({
      participants: [roshan._id, aman._id],
      lendingRelationship: roshanAmanRel._id,
    });

    const aMsg1 = await Message.create({
      conversation: convRoshanAman._id,
      sender: roshan._id,
      receiver: aman._id,
      message: 'Booked our concert tickets, your share is ₹2,000.',
      createdAt: daysAgo(8),
      read: true,
    });

    convRoshanAman.lastMessage = aMsg1._id;
    await convRoshanAman.save();

    // 4. Notifications for Roshan
    console.log('Seeding Notifications...');
    await Notification.create([
      {
        user: roshan._id,
        type: 'repayment',
        title: 'Repayment Received',
        message: 'Rahul Sharma sent you ₹2,000. Remaining balance: ₹3,000.',
        read: false,
        createdAt: daysAgo(2),
      },
      {
        user: roshan._id,
        type: 'lending',
        title: 'Lending Added',
        message: 'Priya Patel added ₹1,500 split for dinner.',
        read: true,
        createdAt: daysAgo(4),
      },
      {
        user: roshan._id,
        type: 'ai',
        title: 'AI Insights Ready',
        message: 'Your monthly spending pattern summary is ready for review.',
        read: false,
        createdAt: daysAgo(1),
      },
    ]);

    console.log('Seeding completed successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials:');
    console.log('Roshan : roshan@pocketguard.com / password123 (Mobile: 9876543210)');
    console.log('Rahul  : rahul@pocketguard.com  / password123 (Mobile: 9876543211)');
    console.log('Aman   : aman@pocketguard.com   / password123 (Mobile: 9876543212)');
    console.log('Priya  : priya@pocketguard.com  / password123 (Mobile: 9876543213)');
    console.log('----------------------------------------------------');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
