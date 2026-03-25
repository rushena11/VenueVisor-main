import axios from 'axios';

// Base URL
axios.defaults.baseURL = '/';

// Default headers
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// CSRF (optional)
const csrfToken = document
  .querySelector('meta[name="csrf-token"]')
  ?.getAttribute('content');

if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

// Bearer token interceptor
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ⚠️ FIXED BACKTICKS
  }

  return config;
});

export default axios;