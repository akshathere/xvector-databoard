// app/services/api.js
import Service, { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
const API_BASE = 'http://localhost:8000'; // Your FastAPI backend URL

export default class ApiService extends Service {
  @service router;

  @tracked token = localStorage.getItem('xvector_token') || null;
  @tracked userEmail = localStorage.getItem('xvector_user') || null;
  get isAuthenticated() {
    return Boolean(this.token);
  }

  setSession(token, email) {
    this.token = token;
    this.userEmail = email;
    localStorage.setItem('xvector_token', token);
    if (email) localStorage.setItem('xvector_user', email);
  }

  logout = () => {
    this.token = null;
    this.userEmail = null;
    localStorage.removeItem('xvector_token');
    localStorage.removeItem('xvector_user');
    this.router.transitionTo('login');
  };

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Only set JSON content-type if body is not FormData (for CSV uploads)
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

// eslint-disable-next-line warp-drive/no-external-request-patterns
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Session expired. Please log in again.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `API Error (${response.status})`);
    }

    return response.json();
  }

}
