import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📡 ${timestamp} ${req.method} ${req.url}`, {
    origin: req.get('origin'),
    userAgent: req.get('user-agent')?.substring(0, 50),
    contentType: req.get('content-type'),
    hasAuth: !!req.get('authorization')
  });
  next();
});

// Basic health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Import routes (only working ones to avoid compilation errors)
import authRoutes from './api/auth';
import classRoutes from './api/classes';
import assignmentRoutes from './api/assignments';
import judge0Routes from './api/judge0';
import studentRoutes from './api/students';

// Use routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/judge0', judge0Routes);
app.use('/api/v1/students', studentRoutes);

// Note: Tests and announcements routes disabled due to compilation errors
// TODO: Fix Prisma schema mismatches in judge0-execution.service.ts

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
}); 