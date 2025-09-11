import { ICMS_URL } from '@env';
const API_BASE = ICMS_URL;

const API_ENDPOINTS = {
  VENDORS: `${API_BASE}/api/getvendorlist`,
  FINDPRODUCTFROMHICKSVILL: `${API_BASE}/api/find-hicksville-products`,
  PRODUCTLINKING: `${API_BASE}/api/invoice/product/update`,
  SEARCHVENDOR : `${API_BASE}/api/searchvendor`,
  GETINVOICEDATA: `${API_BASE}/api/getCompletedInvoiceData`,
  GETINVOICELIST: `${API_BASE}/api/getinvoicelist`,
  UPLOAD_IMAGE: `${API_BASE}/api/upload-image`,
};

export default API_ENDPOINTS;
