const jwt = require('jsonwebtoken');
const User = require('../models/User');

let ioInstance = null;
const onlineUsers = new Map(); // userId string -> Set of socket.id

const initSocket = (io) => {
  ioInstance = io;

  // Socket middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'pocketguard_super_secret_jwt_key_2026_production'
      );
      const user = await User.findById(decoded.id).select('_id name mobile email');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket auth failed:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Register user socket
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for targeted alerts
    socket.join(`user_${userId}`);

    // Broadcast user online status
    io.emit('user:status', {
      userId,
      status: 'online',
      onlineUserIds: Array.from(onlineUsers.keys()),
    });

    // Provide initial list of online users to the newly connected socket
    socket.emit('users:online_list', Array.from(onlineUsers.keys()));

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
      }
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId, receiverId }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('typing:start', {
          conversationId,
          userId,
          name: socket.user.name,
        });
      }
      if (receiverId) {
        io.to(`user_${receiverId}`).emit('typing:start', {
          conversationId,
          userId,
          name: socket.user.name,
        });
      }
    });

    socket.on('typing:stop', ({ conversationId, receiverId }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('typing:stop', {
          conversationId,
          userId,
        });
      }
      if (receiverId) {
        io.to(`user_${receiverId}`).emit('typing:stop', {
          conversationId,
          userId,
        });
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline status
          io.emit('user:status', {
            userId,
            status: 'offline',
            onlineUserIds: Array.from(onlineUsers.keys()),
          });
        }
      }
    });
  });

  return io;
};

// Helper function to emit to a specific user
const emitToUser = (userId, event, payload) => {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId.toString()}`).emit(event, payload);
  }
};

// Helper function to emit to a conversation room
const emitToConversation = (conversationId, event, payload) => {
  if (ioInstance && conversationId) {
    ioInstance.to(`conversation_${conversationId.toString()}`).emit(event, payload);
  }
};

const getIo = () => ioInstance;

const isUserOnline = (userId) => {
  return onlineUsers.has(userId.toString());
};

module.exports = {
  initSocket,
  emitToUser,
  emitToConversation,
  getIo,
  isUserOnline,
};
