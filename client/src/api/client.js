import axios from 'axios';

// Helper to extract cookie by name
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: attach CSRF token header from cookie if present
api.interceptors.request.use((config) => {
  const csrfToken = getCookie('csrfToken');
  if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// Track refresh in flight to prevent duplicate rotation calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: handle token expiration and automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const errorData = error.response?.data?.error;

    // If 401 ACCESS_TOKEN_EXPIRED and not already retrying
    if (
      error.response?.status === 401 &&
      errorData?.code === 'ACCESS_TOKEN_EXPIRED' &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshErr) {
        isRefreshing = false;
        processQueue(refreshErr, null);
        // Dispatch session expired event so React Context can clean up
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('securecloud:session-expired'));
        }
        return Promise.reject(refreshErr);
      }
    }

    const errorPayload = errorData || {
      code: 'REQUEST_FAILED',
      message: error.message || 'An unexpected network error occurred'
    };
    return Promise.reject(errorPayload);
  }
);

export default api;
