const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');
const { generalLimiter } = require('./src/middlewares/rateLimiter');
const Visitor = require('./src/models/Visitor');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const visitorRoutes = require('./src/routes/visitorRoutes');
const gateRoutes = require('./src/routes/gateRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const userRoutes = require('./src/routes/userRoutes');
const gateLogRoutes = require('./src/routes/gateLogRoutes');

const app = express();
const server = http.createServer(app);

// WebSocket Setup
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Attach io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Security & Parsing Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false // Disabled for embedded QR/SVG previews
  })
);

app.use(
  cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' })); // Support webcam base64 photo capture
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CCL DVMS Enterprise v2.0 API is running',
    version: '2.0.0',
    timestamp: new Date()
  });
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/visitors', visitorRoutes);
app.use('/api/v1/gate', gateRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/users', userRoutes);

// Backward-compatible mounts and reference site aliases
app.use('/api/visitors', visitorRoutes);
app.use('/api/gate-logs', gateLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/dashboard', dashboardRoutes);

const { exportReport } = require('./src/controllers/VisitorController');
const { getEmergencyRollCall } = require('./src/controllers/DashboardController');
const seedDatabase = require('./src/utils/seedData');

app.get('/api/export-csv', exportReport);
app.get('/api/v1/export-csv', exportReport);
app.get('/api/emergency/rollcall', getEmergencyRollCall);
app.get('/api/v1/emergency/rollcall', getEmergencyRollCall);
app.post('/api/seed', async (req, res, next) => {
  try {
    await seedDatabase();
    res.json({ success: true, message: 'Database seeded successfully with initial data' });
  } catch (err) {
    next(err);
  }
});

// Serve compiled frontend static files if available
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/socket.io')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    next();
  });
}

// Centralized Error Handling Middleware
app.use(errorHandler);

// Background interval: Auto-expire passes past midnight (runs hourly)
setInterval(async () => {
  try {
    const now = new Date();
    const result = await Visitor.updateMany(
      {
        expiresAt: { $lt: now },
        status: { $in: ['PENDING', 'APPROVED'] }
      },
      {
        $set: { status: 'EXPIRED' }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`[AutoExpire] Expired ${result.modifiedCount} overdue visitor passes.`);
      io.emit('kpi:update');
    }
  } catch (err) {
    console.error('[AutoExpire Error]:', err.message);
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  try {
    const User = require('./src/models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('No users found in database. Auto-seeding initial departments & system users...');
      await seedDatabase();
    }
  } catch (seedErr) {
    console.warn('[AutoSeed Notice]:', seedErr.message);
  }
  server.listen(PORT, () => {
    console.log(`CCL DVMS Enterprise API running on http://localhost:${PORT}`);
    console.log(`WebSocket Server active on ws://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
