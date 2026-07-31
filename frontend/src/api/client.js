import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// 1. Request Interceptor: Automatically attach the token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. NEW Response Interceptor: Catch 401s globally
api.interceptors.response.use(
  (response) => {
    // If the request succeeds, just pass the data through normally
    return response;
  },
  (error) => {
    // If the backend returns a 401 Unauthorized, the token is dead.
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token'); // Destroy the bad token
      window.location.reload();         // Instantly reload to trigger the login screen
    }
    return Promise.reject(error);
  }
);

export default api;