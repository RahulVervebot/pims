// src/services/vendorApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_ENDPOINTS from '../../../icms_config/api';

/** Search vendors by query. Returns array of vendor objects. */
export async function searchVendors(query) {
  if (!query || query.trim().length < 2) return [];
  const token = await AsyncStorage.getItem('access_token');
  const icms_store = await AsyncStorage.getItem('icms_store');
  const res = await fetch(API_ENDPOINTS.SEARCHVENDOR, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': token ?? '',
      'mode': 'MOBILE',
      'store': icms_store,
    },
    body: JSON.stringify({ q: query }),
  });

console.log("token:",token,icms_store,API_ENDPOINTS);
  if (!res.ok) {
    console.warn('searchVendors failed:', res.status, await res.text().catch(()=>''));
    return [];
  }

  const data = await res.json().catch(() => ({}));
  console.log("vendor search data:",data)
  return Array.isArray(data?.results) ? data.results : [];
}
