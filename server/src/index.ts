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
import { dsaProgressRoutes } from './api/dsa-progress';                                                                                                      

import { initializeScheduledJobs } from './cron';
import { WebSocketService } from './services/websocket.service';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 4000;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Configure CORS to allow requests from frontend
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://code-class.up.railway.app',
      'https://code-class-eight.vercel.app'
    ];
    
    // Add any additional origins from environment variable
    if (process.env.ADDITIONAL_CORS_ORIGINS) {
      allowedOrigins.push(...process.env.ADDITIONAL_CORS_ORIGINS.split(','));
    }
    
    console.log('CORS check for origin:', origin, 'Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};

console.log('CORS Origins:', corsOptions.origin);
app.use(cors(corsOptions));

// Ensure CORS headers are set for all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all requests for debugging
  console.log(`${req.method} ${req.path} - Origin: ${origin || 'none'}`);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request for:', req.path);
    console.log('Setting CORS headers for preflight response');
    res.status(200).end();
    return;
  }
  
  next();
});
app.use(express.json());

// Debug middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/announcements', announcementRoutes);
app.use('/api/v1/tests', testRoutes);
app.use('/api/v1/monitoring', monitoringRoutes);
app.use('/api/v1/dsa', dsaProgressRoutes);

// Initialize all scheduled jobs
initializeScheduledJobs();

app.get('/', (req, res) => {
  res.send('Hello from the backend! Milestone 1 Core Infrastructure Ready.');
});

// CORS test endpoint
app.get('/api/v1/cors-test', (req, res) => {
  console.log('CORS test endpoint hit');
  res.json({ 
    message: 'CORS is working!', 
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    method: req.method
  });
});

server.listen(port, () => {
  console.log(`🎉 Server running at http://localhost:${port}`);
}); 