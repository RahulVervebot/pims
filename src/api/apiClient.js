// src/api/apiClient.js
import axios from 'axios';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- helpers ----------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const toResult = ({ ok, status = 0, data = null, error = null, problem = null, headers = {} }) => ({
  ok, status, data, error, problem, headers,
});

const mapProblem = (err) => {
  if (axios.isCancel(err)) return 'CANCELLED';
  if (err.code === 'ECONNABORTED') return 'TIMEOUT';
  if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') return 'NETWORK_ERROR';

  const status = err?.response?.status;
  if (!status) return 'UNKNOWN';
  if (status >= 500) return 'SERVER_ERROR';
  if (status === 404) return 'NOT_FOUND';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 429) return 'RATE_LIMIT';
  return 'CLIENT_ERROR';
};

const backoffMs = (attempt) => Math.min(2000, 200 * 2 ** attempt); // 200, 400, 800, 1600, 2000

// ---------- axios instance ----------
const baseURL = (API_URL || '').replace(/\/+$/, ''); // strip trailing slash
const api = axios.create({
  baseURL,
  timeout: 10000,
});

// auth/header injection
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token'); // adjust key if different
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  config.headers['Accept'] = 'application/json';
  // Allow sending form-data without overriding boundary
  if (config.data instanceof FormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

// (optional) minimal response interceptor (keep for logging if you want)
api.interceptors.response.use(
  (resp) => resp,
  (err) => Promise.reject(err)
);

// ---------- core performer with retry ----------
/**
 * @param {import('axios').AxiosRequestConfig} cfg
 * @param {{ retry?: number }} opts
 */
const perform = async (cfg, opts = {}) => {
  const { retry = 2 } = opts;
  let lastError = null;

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const resp = await api.request(cfg);
      return toResult({
        ok: resp.status >= 200 && resp.status < 300,
        status: resp.status,
        data: resp.data,
        headers: resp.headers,
      });
    } catch (err) {
      lastError = err;
      const problem = mapProblem(err);
      const status = err?.response?.status || 0;

      const shouldRetry =
        problem === 'NETWORK_ERROR' ||
        problem === 'TIMEOUT' ||
        (status >= 500 && status < 600);

      if (attempt < retry && shouldRetry) {
        await delay(backoffMs(attempt));
        continue;
      }

      return toResult({
        ok: false,
        status,
        data: err?.response?.data ?? null,
        error: err?.message ?? 'Request failed',
        problem,
        headers: err?.response?.headers ?? {},
      });
    }
  }

  return toResult({
    ok: false,
    status: 0,
    data: null,
    error: lastError?.message ?? 'Unknown error',
    problem: mapProblem(lastError),
  });
};

// ---------- exported API helpers ----------
export const createAbort = () => new AbortController();

export const GET = (url, { params, headers, timeout, signal, retry } = {}) =>
  perform({ method: 'GET', url, params, headers, timeout, signal }, { retry });

export const POST = (url, { data, params, headers, timeout, signal, retry } = {}) =>
  perform({ method: 'POST', url, data, params, headers, timeout, signal }, { retry });

export const PUT = (url, { data, params, headers, timeout, signal, retry } = {}) =>
  perform({ method: 'PUT', url, data, params, headers, timeout, signal }, { retry });

export const PATCH = (url, { data, params, headers, timeout, signal, retry } = {}) =>
  perform({ method: 'PATCH', url, data, params, headers, timeout, signal }, { retry });

export const DELETE = (url, { data, params, headers, timeout, signal, retry } = {}) =>
  perform({ method: 'DELETE', url, data, params, headers, timeout, signal }, { retry });

export default { createAbort, GET, POST, PUT, PATCH, DELETE };
