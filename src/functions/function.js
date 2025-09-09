// src/function/function.js
import { API_URL } from '@env';

/**
 * Fetch all products
 * @returns {Promise<Array>} products array
 */
export async function getProducts() {
  const url = `${API_URL}/api/products`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch products (${res.status}): ${text || 'No details'}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getLatestProducts() {
  const url = `${API_URL}/api/latest-products`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch products (${res.status}): ${text || 'No details'}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}


export function capitalizeWords(str = '') {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function toAbsoluteUri(input) {
  if (!input) return null;
  // Already a full URL or data URI
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:')) {
    return input;
  }
  // Likely a relative path like "uploads/xyz.svg" or "/uploads/xyz.svg"
  const clean = input.startsWith('/') ? input.slice(1) : input;
  return `${API_URL}/${clean}`;
}

/** Quick check if a uri looks like an SVG (mime or extension or xml payload) */
export function looksLikeSvg(uriOrData) {
  if (!uriOrData) return false;
  const u = uriOrData.toLowerCase();
  return (
    u.startsWith('data:image/svg+xml') ||
    u.endsWith('.svg') ||
    u.includes('<svg') // in case server sends raw xml string (rare)
  );
}

/** GET: /api/product-category — returns all categories */
export async function getTopCategories() {
  const res = await fetch(`${API_URL}/api/product-category`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch categories (${res.status}): ${text || 'No details'}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : [];

  // Normalize fields we’ll use in UI
  return list.map((c) => ({
    _id: c._id,
    category: c.category,
    toplist: !!c.toplist,
    // Normalize image-like fields
    image: toAbsoluteUri(c.image) || c.image || null,
    topicon: toAbsoluteUri(c.topicon) || c.topicon || null,
    topbanner: toAbsoluteUri(c.topbanner) || c.topbanner || null,
    topbannerbottom: toAbsoluteUri(c.topbannerbottom) || c.topbannerbottom || null,
  }));
}

/** GET: /api/products/search?query={category} — products for a given category */
export async function getCategoryProducts(category) {
  if (!category) return [];
  const url = `${API_URL}/api/products/search?query=${encodeURIComponent(category)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch products for "${category}" (${res.status}): ${text || 'No details'}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}