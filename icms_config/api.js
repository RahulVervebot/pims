// icms_config/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ICMSAPIsURL } from '@env'; // optional fallback

const STORAGE_KEY = 'icms_url';

const PATHS = {
  VENDORS: '/api/getvendorlist',
  FINDPRODUCTFROMHICKSVILL: '/api/find-hicksville-products',
  PRODUCTLINKING: '/api/invoice/product/update',
  SEARCHVENDOR: '/api/searchvendor',
  GETINVOICEDATA: '/api/getCompletedInvoiceData',
  GETINVOICELIST: '/api/getinvoicelist',
  UPLOAD_IMAGE: '/api/upload-image',
  OCR_RESPONSE: '/api/ocr',
  SETPRODUCTINTABLEFROMOCR: '/api/setproductintable',
  PREVIEW_OCR: '/api/ocr-preview',
  SAVE_INVOICE: '/api/invoice/scaninvoicedata',
  FETCH_INVOICE: '/api/invoice/getsavedinvoices',
  CREATE_INVOICE: '/api/invoice/create_data',
  UPDATE_INVOICE: '/api/invoice/updateinvoicedetails',
  RED_PRODUCTS: '/api/proxy/redproducts',
  UPDATE_RED_PRODUCTS: '/api/update-redproduct'
 
};

// normalize base: strip trailing slashes
const normalizeBase = (url) => (url || '').replace(/\/+$/, '');

let BASE = normalizeBase(ICMSAPIsURL || globalThis.__ICMS_BASE__ || ''); // env or any pre-set global

export function setICMSBase(url) {
  BASE = normalizeBase(url);
  // keep a global copy so if this module is reloaded, the value persists
  globalThis.__ICMS_BASE__ = BASE;
}

export async function initICMSBase() {
  try {
    const fromStorage = await AsyncStorage.getItem(STORAGE_KEY);
    if (fromStorage) setICMSBase(fromStorage);
  } catch {
    // ignore and keep fallback
  }
}

// Build an object with live getters so usage stays: API_ENDPOINTS.FETCH_INVOICE
const API_ENDPOINTS = {};
for (const [key, path] of Object.entries(PATHS)) {
  Object.defineProperty(API_ENDPOINTS, key, {
    enumerable: true,
    get() {
      return `${BASE}${path}`;
    },
  });
}

export default API_ENDPOINTS;
