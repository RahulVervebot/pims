// src/api/appApi.js
import { GET, POST, PUT, DELETE } from './apiClient';

/* ===================== Utilities: Messages & Validation ===================== */

const withMessage = (res, successMsg, failureMsg) => {
  if (res.ok) return { ...res, message: pickMessage(res) || successMsg || 'Success' };
  return { ...res, message: pickMessage(res) || failureMsg || 'Request failed' };
};

const pickMessage = (res) => {
  // Prefer server message if present
  const serverMsg =
    (typeof res?.data?.message === 'string' && res.data.message) ||
    (typeof res?.error === 'string' && res.error) ||
    null;
  if (serverMsg) return serverMsg;

  const { status, problem } = res || {};
  if (problem === 'CANCELLED') return 'Request was cancelled';
  if (problem === 'TIMEOUT') return 'Request timed out';
  if (problem === 'NETWORK_ERROR') return 'Network error. Check your connection.';
  if (status === 400) return 'Invalid request';
  if (status === 401) return 'Unauthorized';
  if (status === 403) return 'Forbidden';
  if (status === 404) return 'Not found';
  if (status === 409) return 'Conflict';
  if (status === 422) return 'Unprocessable entity';
  if (status >= 500) return 'Server error';
  return null;
};

// ---------- Tiny schema validator ----------
/**
 * Schema field: { type: 'string'|'number'|'boolean', required?: true, min?: number, max?: number,
 *   enum?: string[], email?: true, regex?: RegExp, positive?: true, nonempty?: true }
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

const describeValue = (v) => {
  const t = typeOf(v);
  if (t === 'string') return `"${v}"`;
  if (t === 'number' || t === 'boolean') return String(v);
  if (t === 'null' || t === 'undefined') return t;
  return t;
};

const validate = (payload, schema) => {
  const errors = [];
  for (const [field, rules] of Object.entries(schema)) {
    const val = payload[field];
    const exists = val !== undefined && val !== null && (rules.type !== 'string' || val !== '');

    // required
    if (rules.required && !exists) {
      errors.push(`${field} is required`);
      continue;
    }
    if (!exists) continue;

    // type
    const actualType = typeOf(val);
    if (rules.type && actualType !== rules.type) {
      errors.push(`${field} must be a ${rules.type} (received: ${describeValue(val)})`);
      continue; // other checks depend on type
    }

    // string rules
    if (rules.type === 'string') {
      if (rules.nonempty && val.trim().length === 0) {
        errors.push(`${field} cannot be empty`);
      }
      if (typeof rules.min === 'number' && val.length < rules.min) {
        errors.push(`${field} must be at least ${rules.min} characters`);
      }
      if (typeof rules.max === 'number' && val.length > rules.max) {
        errors.push(`${field} must be at most ${rules.max} characters`);
      }
      if (rules.email && !emailRegex.test(val)) {
        errors.push(`${field} must be a valid email`);
      }
      if (rules.regex && !rules.regex.test(val)) {
        errors.push(`${field} has an invalid format`);
      }
    }

    // number rules
    if (rules.type === 'number') {
      if (Number.isNaN(val)) {
        errors.push(`${field} must be a number (received: NaN)`);
      }
      if (rules.positive && !(val > 0)) {
        errors.push(`${field} must be a positive number`);
      }
      if (typeof rules.min === 'number' && val < rules.min) {
        errors.push(`${field} must be ≥ ${rules.min}`);
      }
      if (typeof rules.max === 'number' && val > rules.max) {
        errors.push(`${field} must be ≤ ${rules.max}`);
      }
    }

    // enum
    if (rules.enum && !rules.enum.includes(val)) {
      errors.push(`${field} must be one of [${rules.enum.map((x) => JSON.stringify(x)).join(', ')}] (received: ${describeValue(val)})`);
    }
  }

  if (errors.length) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: errors.join('; '),
      problem: 'CLIENT_ERROR',
      message: errors[0], // show the first error prominently
      details: errors,    // full list for UI if needed
    };
  }
  return null;
};

/* ============================== API: PRODUCTS ============================== */

export const ProductAPI = {
  // POST /api/products
  async create(payload) {
    // Server expects: { name, size?, image?, price, sale?, category }
    const schema = {
      name: { type: 'string', required: true, nonempty: true, min: 1 },
      size: { type: 'string', required: false },
      image: { type: 'string', required: false },
      price: { type: 'number', required: true, min: 0 },
      sale: { type: 'number', required: false, min: 0 },
      category: { type: 'string', required: true, nonempty: true },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/products', { data: payload, retry: 2, timeout: 12000 });
    return withMessage(res, 'Product saved successfully', 'Failed to save product');
  },

  // GET /api/products
  async list() {
    const res = await GET('/api/products', { retry: 1, timeout: 10000 });
    return withMessage(res, 'Products fetched successfully', 'Failed to fetch products');
  },

  // GET /api/products/search?query=...
  async search(query) {
    const qErr = validate({ query }, { query: { type: 'string', required: true, min: 3 } });
    if (qErr) return qErr;

    const res = await GET('/api/products/search', { params: { query }, retry: 1, timeout: 10000 });
    return withMessage(res, 'Search completed', 'Search failed');
  },

  // POST /api/products/bulk
  async bulkInsert(products) {
    if (!Array.isArray(products) || products.length === 0) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: 'products must be a non-empty array',
        problem: 'CLIENT_ERROR',
        message: 'products must be a non-empty array',
      };
    }

    // Validate each product with the same schema as create()
    const itemSchema = {
      name: { type: 'string', required: true, nonempty: true, min: 1 },
      size: { type: 'string', required: false },
      image: { type: 'string', required: false },
      price: { type: 'number', required: true, min: 0 },
      sale: { type: 'number', required: false, min: 0 },
      category: { type: 'string', required: true, nonempty: true },
    };

    const allErrors = [];
    products.forEach((p, idx) => {
      const v = validate(p, itemSchema);
      if (v) allErrors.push(`Item ${idx + 1}: ${v.details.join('; ')}`);
    });

    if (allErrors.length) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: allErrors.join(' | '),
        problem: 'CLIENT_ERROR',
        message: 'One or more products are invalid',
        details: allErrors,
      };
    }

    const res = await POST('/api/products/bulk', { data: { products }, retry: 1, timeout: 20000 });
    return withMessage(res, 'Products imported successfully', 'Bulk import failed');
  },
};

/* ======================== API: PRODUCT CATEGORIES ========================= */

export const ProductCategoryAPI = {
  // POST /api/products-category
  async create(payload) {
    const schema = {
      category: { type: 'string', required: true, nonempty: true },
      image: { type: 'string', required: false },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/products-category', { data: payload, retry: 1, timeout: 10000 });
    return withMessage(res, 'Product category saved successfully', 'Failed to save product category');
  },

  // GET /api/product-category
  async list() {
    const res = await GET('/api/product-category', { retry: 1, timeout: 10000 });
    return withMessage(res, 'Categories fetched successfully', 'Failed to fetch categories');
  },
};

/* ================================ API: ORDERS ============================== */

export const OrderAPI = {
  // POST /api/orders
  async create(payload) {
    const schema = {
      name: { type: 'string', required: true, nonempty: true },
      size: { type: 'string', required: false },
      image: { type: 'string', required: false },
      price: { type: 'number', required: true, min: 0 },
      sale: { type: 'number', required: false, min: 0 },
      category: { type: 'string', required: false },
      subtotal: { type: 'number', required: true, min: 0 },
      tax: { type: 'number', required: true, min: 0 },
      total: { type: 'number', required: true, min: 0 },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/orders', { data: payload, retry: 1, timeout: 12000 });
    return withMessage(res, 'Order created successfully', 'Failed to create order');
  },

  // GET /api/orders
  async list() {
    const res = await GET('/api/orders', { retry: 1, timeout: 10000 });
    return withMessage(res, 'Orders fetched successfully', 'Failed to fetch orders');
  },

  // GET /api/orders/:id
  async getById(id) {
    const v = validate({ id }, { id: { type: 'string', required: true, nonempty: true } });
    if (v) return v;

    const res = await GET(`/api/orders/${id}`, { retry: 1, timeout: 10000 });
    if (!res.ok && res.status === 404) {
      return { ...res, message: 'Order not found' };
    }
    return withMessage(res, 'Order fetched successfully', 'Failed to fetch order');
  },
};

/* ================================== API: AUTH ============================== */

export const AuthAPI = {
  // POST /api/auth/google  { id, name, email, picture? }
  async google(payload) {
    const schema = {
      id: { type: 'string', required: true, nonempty: true },
      name: { type: 'string', required: true, nonempty: true },
      email: { type: 'string', required: true, email: true },
      picture: { type: 'string', required: false },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/auth/google', { data: payload, retry: 1, timeout: 10000 });
    return withMessage(res, 'User saved successfully', 'Failed to save Google user');
  },

  // POST /api/auth/signup  { username, name, email, role?, password }
  async signup(payload) {
    const schema = {
      username: { type: 'string', required: true, nonempty: true, min: 3 },
      name: { type: 'string', required: true, nonempty: true },
      email: { type: 'string', required: true, email: true },
      role: { type: 'string', required: false },
      password: { type: 'string', required: true, min: 6 },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/auth/signup', { data: payload, retry: 0, timeout: 12000 });
    // Server returns { message: 'User created', user }
    return withMessage(res, 'User created successfully', 'Signup failed');
  },

  // POST /api/auth/login   { email, password }
  async login(payload) {
    const schema = {
      email: { type: 'string', required: true, email: true },
      password: { type: 'string', required: true, nonempty: true },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/auth/login', { data: payload, retry: 0, timeout: 10000 });
    return withMessage(res, 'Login successful', 'Invalid credentials');
  },

  // GET /api/auth/users
  async users() {
    const res = await GET('/api/auth/users', { retry: 1, timeout: 10000 });
    return withMessage(res, 'Users fetched successfully', 'Failed to fetch users');
  },

  // GET /api/auth/users/search?q=...
  async searchUsers(q) {
    const v = validate({ q }, { q: { type: 'string', required: true, min: 3 } });
    if (v) return v;

    const res = await GET('/api/auth/users/search', { params: { q }, retry: 1, timeout: 10000 });
    if (!res.ok && res.status === 404) {
      return { ...res, message: 'No users found', data: [] };
    }
    return withMessage(res, 'Users fetched successfully', 'Failed to search users');
  },

  // POST /api/auth/forgot-password  { email }
  async forgotPassword(payload) {
    const schema = {
      email: { type: 'string', required: true, email: true },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/auth/forgot-password', { data: payload, retry: 0, timeout: 10000 });
    return withMessage(res, 'Password reset link sent to email', 'Failed to send password reset link');
  },
};

/* ============================== API: TRANSACTIONS ========================= */

export const TransactionAPI = {
  // POST /api/transactions  { amount:number>0, note:string, type:'credit'|'debit' }
  async create(payload) {
    const schema = {
      amount: { type: 'number', required: true, positive: true },
      note: { type: 'string', required: true, nonempty: true },
      type: { type: 'string', required: true, enum: ['credit', 'debit'] },
    };
    const v = validate(payload, schema);
    if (v) return v;

    const res = await POST('/api/transactions', { data: payload, retry: 1, timeout: 10000 });
    return withMessage(res, 'Transaction saved successfully', 'Failed to save transaction');
  },

  // GET /api/transactions -> { balance, transactions }
  async list() {
    const res = await GET('/api/transactions', { retry: 1, timeout: 10000 });
    return withMessage(res, 'Transactions fetched successfully', 'Failed to fetch transactions');
  },
};