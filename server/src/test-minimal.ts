import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 4001; // Use different port for testing

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'OK', message: 'Minimal server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal test server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
}); 