require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const pollRoutes = require('./src/routes/pollRoutes');
const voteRoutes = require('./src/routes/voteRoutes');

// Import rate limiters
const { generalLimiter, voteLimiter } = require('./src/middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Make io accessible to routes
app.set('io', io);

// --- Middleware ---
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for our frontend
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general rate limiter to all requests
app.use(generalLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/vote', voteLimiter, voteRoutes);

// --- Socket.io Connection ---
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a poll room for live updates
  socket.on('join-poll', (pollId) => {
    socket.join(`poll-${pollId}`);
    console.log(`📊 ${socket.id} joined poll room: poll-${pollId}`);
  });

  socket.on('leave-poll', (pollId) => {
    socket.leave(`poll-${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// --- Catch-all: Serve index.html for unknown routes ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 Anonymous Polling Server running on http://localhost:${PORT}`);
    console.log(`📊 Real-time updates via Socket.io enabled`);
    console.log(`🔒 Rate limiting & security middleware active\n`);
  });
}).catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});
