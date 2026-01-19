import AsyncStorage from '@react-native-async-storage/async-storage';
import { criticallyDampedSpringCalculations } from 'react-native-reanimated/lib/typescript/animation/springUtils';
const getBaseUrl = async () => {
  const storeUrl = await AsyncStorage.getItem('storeurl');
  if (!storeUrl) {
    throw new Error('Missing store_url in AsyncStorage.');
  }
  return storeUrl.replace(/\/$/, '');
};

const buildHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  if (!token) {
    throw new Error('Missing access token.');
  }
  return {
    // accept: 'application/json',
    access_token: token,
  };
};
const buildpostHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  if (!token) {
    throw new Error('Missing access token.');
  }
  return {
    // accept: 'application/json',
     'Content-Type': 'application/json',
    access_token: token,
  };
};

export async function getPromotionGroupsDetails() {
  const headers = await buildHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/app/get_promotion_groups_details`, {
    method: 'GET',
    headers,
  });
console.log("store url:",baseUrl);
console.log("resoonse:",res);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch promotions (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

export async function createMixMatchPromotion(payload) {
  const headers = await buildpostHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/app/create/mix/match`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Failed to create mix match (${res.status})`);
  }
console.log("resonose josn for mix",json);
  return json;
}
export async function updateMixMatchPromotion(payload) {
  const headers = await buildpostHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/app/update/mix_match`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
console.log("udpate body",payload);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Failed to update mix match (${res.status})`);
  }
console.log("json response put:",json);
  return json;
}

export async function deleteMixMatchPromotion(groupId) {
  const headers = await buildpostHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/delete/mix_match_promotion`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ group_id: groupId }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `Failed to delete mix match (${res.status})`);
  }
  return json;
}

export async function getDaysList() {
  const headers = await buildHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/get/app/days_list`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch days list (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json().catch(() => ({}));
  return Array.isArray(json) ? json : [];
}

export async function searchProductsByBarcode(text) {
  const headers = await buildHeaders();
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/pos/app/product/search?query=${encodeURIComponent(text)}`, {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    const textRes = await res.text().catch(() => '');
    throw new Error(`Failed to search products (${res.status}): ${textRes || 'No details'}`);
  }

  const json = await res.json().catch(() => ({}));
  return Array.isArray(json?.products) ? json.products : [];
}
