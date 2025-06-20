import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/v1/health', (req, res) => {
  console.log('✅ Health check requested');
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Auth mock endpoint for testing
app.post('/api/v1/auth/login', (req, res) => {
  console.log('✅ Login attempt:', req.body);
  res.json({ 
    message: 'Mock login successful',
    user: { id: 1, email: req.body.email, role: 'STUDENT' },
    token: 'mock-jwt-token'
  });
});

// Classes mock endpoint
app.get('/api/v1/classes', (req, res) => {
  console.log('✅ Classes requested');
  res.json({ classes: [] });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Minimal server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`📍 Login: http://localhost:${PORT}/api/v1/auth/login`);
  console.log(`📍 Classes: http://localhost:${PORT}/api/v1/classes`);
}); 