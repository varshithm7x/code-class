import axios from 'axios';

// Create an Axios instance with a base URL
// Environment Configuration:
// - VITE_API_URL should be set in .env.local or .env files
// - For local development: VITE_API_URL=http://localhost:4000/api/v1 in .env file
// - For production: VITE_API_URL=https://code-class.up.railway.app/api/v1 in .env file

// Ensure the base URL always includes /api/v1
const getBaseURL = () => {
  const envURL = import.meta.env.VITE_API_URL;
  
  // If environment variable is set, use it
  if (envURL) {
    // Ensure it ends with /api/v1 if not already present
    if (envURL.endsWith('/api/v1')) {
      return envURL;
    } else if (envURL.endsWith('/')) {
      return envURL + 'api/v1';
    } else {
      return envURL + '/api/v1';
    }
  }
  
  // Default fallback
  return 'https://code-class.up.railway.app/api/v1';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Debug log to help identify any issues (remove in production)
console.log('API Base URL:', api.defaults.baseURL);

// Interceptor to add JWT token to request headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle common response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if unauthorized
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
