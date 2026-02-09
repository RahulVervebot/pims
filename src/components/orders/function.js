import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getPosOrders(params = {}, { useFilter = false } = {}) {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }
  const {
    order_id,
    min_amount,
    max_amount,
    start_date,
    end_date,
    auth_code,
    card_number,
    page = 1,
    limit = 10,
  } = params;

  const qs = new URLSearchParams(
    Object.entries({
      order_id,
      min_amount,
      max_amount,
      start_date,
      end_date,
      auth_code,
      card_number,
      page,
      limit,
    })
      .filter(([, v]) => v !== undefined && v !== null && String(v).length > 0)
      .reduce((acc, [k, v]) => {
        acc[k] = String(v);
        return acc;
      }, {})
  ).toString();
  const endpoint = useFilter ? '/pos/app/orders/filter' : '/pos/app/get/pos/orders';
  const res = await fetch(`${apiBase}${endpoint}?${qs}`, {
    method: 'GET',
    headers: { accept: 'application/json', access_token: token },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch orders (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  return {
    orders: Array.isArray(json?.orders) ? json.orders : [],
    pagination: json?.pagination || null,
  };
}

export async function getOrderPreview(orderId) {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }
  if (!orderId) {
    throw new Error('Missing order_id');
  }

  const qs = new URLSearchParams({ order_id: String(orderId) }).toString();
  const res = await fetch(`${apiBase}/pos/app/get/pos/order/preview?${qs}`, {
    method: 'GET',
    headers: { accept: 'application/json', access_token: token },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch order preview (${res.status}): ${text || 'No details'}`);
  }
  return res.json();
}

export async function printOrderReport(orderIds, regId) {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }

  const res = await fetch(`${apiBase}/pos/app/print/order/report`, {
    method: 'POST',
    headers: { accept: 'application/json', 'Content-Type': 'application/json', access_token: token },
    body: JSON.stringify({
      order_ids: Array.isArray(orderIds) ? orderIds : [orderIds],
      reg_id: regId,
    }),
  });
  const json = await res.json().catch(() => ({}));
  console.log("print json:",json);
  if (!res.ok) {
    const msg = json?.message || json?.error?.message || 'Failed to print';
    throw new Error(msg);
  }
  return json;
}
