import 'tsconfig-paths/register';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';

import authRoutes from './api/auth';
import classRoutes from './api/classes';
import assignmentRoutes from './api/assignments';
import analyticsRoutes from './api/analytics';
import studentRoutes from './api/students';
import announcementRoutes from './api/announcements';
import testRoutes from './api/tests/tests.routes';                                                                                                      
import monitoringRoutes from './api/monitoring/monitoring.routes';                                                                                                      

import { initializeScheduledJobs } from './cron';
import { WebSocketService } from './services/websocket.service';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 4000;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Configure CORS to allow requests from frontend
const corsOptions = {
  origin: [
    'http://localhost:8080', // Local development
    'http://localhost:3000', // Alternative local port
    'https://codeclass.up.railway.app', // Railway backend (same domain)
    'https://code-class-eight.vercel.app', // Deployed frontend on Vercel
    // Add your deployed frontend URL here when you deploy it
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);

// Initialize all scheduled jobs
initializeScheduledJobs();

app.get('/', (req, res) => {
  res.send('Hello from the backend! Milestone 1 Core Infrastructure Ready.');
});

server.listen(port, () => {
  console.log(`🎉 Server running at http://localhost:${port}`);
}); 