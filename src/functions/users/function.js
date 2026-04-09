import AsyncStorage from '@react-native-async-storage/async-storage';

// Get all POS users
export async function getPosUsers() {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }

  const res = await fetch(`${apiBase}/pos/app/pos_get_users`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: token,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch users (${res.status}): ${text || 'No details'}`);
  }

  const json = await res.json();
  return {
    users: Array.isArray(json?.result?.users) ? json.result.users : [],
    count: json?.result?.count || 0,
  };
}

// Create a new POS user
export async function createPosUser({ name, email, login, password, pos_role }) {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }

  const res = await fetch(`${apiBase}/pos/app/pos_create_user`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: token,
    },
    body: JSON.stringify({
      name,
      email,
      login,
      password,
      pos_role,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to create user (${res.status}): ${text || 'No details'}`);
  }

  return res.json();
}

// Update a POS user
export async function updatePosUser(userId, updates = {}) {
  const [storeUrl, baseUrl, token] = await Promise.all([
    AsyncStorage.getItem('storeurl'),
    AsyncStorage.getItem('baseurl'),
    AsyncStorage.getItem('access_token'),
  ]);
  const apiBase = storeUrl || baseUrl;
  if (!apiBase || !token) {
    throw new Error('Missing storeurl/baseurl or access_token in AsyncStorage.');
  }

  const res = await fetch(`${apiBase}/pos/app/pos_update_user`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: token,
    },
    body: JSON.stringify({
      user_id: userId,
      ...updates,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update user (${res.status}): ${text || 'No details'}`);
  }

  return res.json();
}
