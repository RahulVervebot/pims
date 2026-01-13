import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL_KEY = 'chat_ai_baseurl';
const API_KEY = 'chat_ai_api';

export async function sendChatAIQuery({ query, conversationHistory, signal }) {
  if (!query) throw new Error('Query is required.');

  const entries = await AsyncStorage.multiGet([BASE_URL_KEY, API_KEY]);
  const baseUrl = entries?.[0]?.[1];
  const apiKey = entries?.[1]?.[1];

  if (!baseUrl) throw new Error('Missing chat AI base URL.');
  if (!apiKey) throw new Error('Missing chat AI API key.');

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    signal,
    body: JSON.stringify({
      query,
      conversationHistory: Array.isArray(conversationHistory) ? conversationHistory : [],
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
  }

  return json;
}
