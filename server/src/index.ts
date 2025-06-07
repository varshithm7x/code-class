import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './api/auth';
import classRoutes from './api/classes';
import assignmentRoutes from './api/assignments';
import { scheduleSubmissionChecks } from './cron';

const app: Express = express();
const port = process.env.PORT || 3001;

// Configure CORS to allow requests from frontend
const corsOptions = {
  origin: [
    'http://localhost:8080', // Local development
    'http://localhost:3000', // Alternative local port
    'https://code-class-eight.vercel.app', // Deployed frontend (if same domain)
    // Add your deployed frontend URL here when you deploy it
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/classes', classRoutes);
app.use('/api/v1/assignments', assignmentRoutes);

// Schedule cron jobs
scheduleSubmissionChecks();

app.get('/', (req: Request, res: Response) => {
  res.send('Hello from the backend!');
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
}); 