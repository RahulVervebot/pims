import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  useWindowDimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice from '@react-native-voice/voice';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Sound from 'react-native-sound';

import AttachmentButton from './AttachmentButton';
import AttachmentPreview from './AttachmentPreview';
import Icon from 'react-native-vector-icons/MaterialIcons';

const normalizeBaseUrl = (value) => String(value || '').replace(/\/$/, '');
const normalizeAttachmentBase = (value) => {
  const base = normalizeBaseUrl(value);
  if (!base) return '';
  const apiIndex = base.indexOf('/api');
  if (apiIndex === -1) return base;
  return base.slice(0, apiIndex);
};
const normalizeWsUrl = (value) => {
  const raw = String(value || '').replace(/\/$/, '');
  if (!raw) return '';
  if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw;
  if (raw.startsWith('https://')) return `wss://${raw.slice('https://'.length)}`;
  if (raw.startsWith('http://')) return `ws://${raw.slice('http://'.length)}`;
  return raw;
};
const withTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);
const buildApiUrl = (base, path) => {
  const normalized = normalizeBaseUrl(base);
  if (!normalized) return path;
  const hasApiSegment = /\/api(\/|$)/.test(normalized);
  return hasApiSegment ? `${normalized}${path}` : `${normalized}/api${path}`;
};
const parseJsonSafe = async (res, context = '') => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    const snippet = text.slice(0, 200);
    const status = res?.status ? ` (${res.status})` : '';
    const label = context ? ` ${context}` : '';
    throw new Error(`Invalid JSON${status}${label}: ${snippet}`);
  }
};

const ConversationTypeSelector = ({ onSelect, onCancel }) => (
  <View style={styles.typeSelector}>
    <Text style={styles.typeTitle}>Choose conversation type</Text>
    <Text style={styles.typeSubtitle}>Pick how you want to chat with us.</Text>
    <TouchableOpacity style={styles.typeCard} onPress={() => onSelect('ai')}>
      <View style={styles.typeCardIcon}>
        <Icon name="smart-toy" size={18} color="#16A34A" />
      </View>
      <View style={styles.typeCardBody}>
        <Text style={styles.typeCardTitle}>Ask AI Agent</Text>
        <Text style={styles.typeCardText}>Get instant answers and insights from your POS data.</Text>
      </View>
      <View style={styles.typeCardAction}>
        <Text style={styles.typeCardActionText}>Start</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity style={styles.typeCard} onPress={() => onSelect('support')}>
      <View style={styles.typeCardIcon}>
        <Icon name="support-agent" size={18} color="#16A34A" />
      </View>
      <View style={styles.typeCardBody}>
        <Text style={styles.typeCardTitle}>Contact Support</Text>
        <Text style={styles.typeCardText}>Message a live support agent for help and troubleshooting.</Text>
      </View>
      <View style={styles.typeCardAction}>
        <Text style={styles.typeCardActionText}>Start</Text>
      </View>
    </TouchableOpacity>
    <TouchableOpacity style={[styles.typeBtn, styles.typeCancel]} onPress={onCancel}>
      <Text style={styles.typeCancelText}>Cancel</Text>
    </TouchableOpacity>
  </View>
);

export default function Chat({ style, buttonStyle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [switchingAgent, setSwitchingAgent] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [, forceUpdate] = useState({});
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [userName, setUserName] = useState('');
  const [apiBase, setApiBase] = useState('');
  const [wsBase, setWsBase] = useState('');
  const [recording, setRecording] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.max(Math.round(windowHeight * 0.6), 420);
  const beepRef = useRef(null);
  const messageRef = useRef('');
  const voiceAutoSendRef = useRef(false);
  const pendingTypeMessageRef = useRef('');
  const showTypeSelectorRef = useRef(false);
  const selectedConversationRef = useRef(null);

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const loadedConversationRef = useRef(null);
  const aiPollingRef = useRef(null);

  const isAuthenticated = !!accessToken;
  const showAttachments = true;

  useEffect(() => {
    (async () => {
      const entries = await AsyncStorage.multiGet([
        'chatai_access',
        'chatai_full_name',
        'chatai_username',
        'chatai_email',
        'tulsi_ai_backend',
        'tulsi_websocket',
      ]);
      const getEntry = (key) => entries.find(([k]) => k === key)?.[1];
      const token = getEntry('chatai_access');
      const fullName = getEntry('chatai_full_name');
      const userHandle = getEntry('chatai_username');
      const userEmail = getEntry('chatai_email');
      const apiUrl = getEntry('tulsi_ai_backend');
      const wsUrl = getEntry('tulsi_websocket');
      setAccessToken(token || '');
      setUserName(fullName || userHandle || userEmail || 'You');
      setApiBase(normalizeBaseUrl(apiUrl));
      setWsBase(normalizeWsUrl(wsUrl));
    })();
  }, []);

  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    showTypeSelectorRef.current = showTypeSelector;
  }, [showTypeSelector]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    Sound.setCategory('Playback');
    const asset = Image.resolveAssetSource(require('../assets/beep.mp3'));
    const sourceUri = String(asset?.uri || '');
    if (!sourceUri) return;
    const sound = new Sound(sourceUri, (e) => {
      if (e) console.log('beep load error:', e);
    });
    beepRef.current = sound;
    return () => {
      sound.release();
      beepRef.current = null;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const perm = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
        const result = await request(perm);
        setMicGranted(result === RESULTS.GRANTED);
      } catch {
        setMicGranted(false);
      }
    })();
  }, []);

  useEffect(() => {
    Voice.onSpeechResults = (event) => {
      const text = event?.value?.[0] || '';
      if (text) setMessage(text);
    };
    Voice.onSpeechPartialResults = (event) => {
      const text = event?.value?.[0] || '';
      if (text) setMessage(text);
    };
    Voice.onSpeechError = () => {
      setRecording(false);
    };
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const authHeaders = useMemo(() => {
    const headers = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: accessToken || '',
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    return headers;
  }, [accessToken]);

  const endpoints = useMemo(() => {
    if (!apiBase) return null;
    return {
      conversations: withTrailingSlash(buildApiUrl(apiBase, '/chat/conversations')),
      conversationHistory: (id) => withTrailingSlash(buildApiUrl(apiBase, `/chat/conversations/${id}/messages`)),
      sendMessage: (id) => withTrailingSlash(buildApiUrl(apiBase, `/chat/conversations/${id}/messages`)),
      createConversation: withTrailingSlash(buildApiUrl(apiBase, '/chat/conversations')),
      switchAgent: (id) => withTrailingSlash(buildApiUrl(apiBase, `/chat/conversations/${id}/switch-agent`)),
      uploadAttachment: withTrailingSlash(buildApiUrl(apiBase, '/chat/attachments/upload')),
    };
  }, [apiBase]);

  const attachmentBase = useMemo(() => normalizeAttachmentBase(apiBase), [apiBase]);

  const normalizeList = (input) => {
    if (Array.isArray(input)) return input;
    if (Array.isArray(input?.data)) return input.data;
    if (Array.isArray(input?.results)) return input.results;
    if (Array.isArray(input?.conversations)) return input.conversations;
    return [];
  };

  const transformMessages = (items) =>
    normalizeList(items).map((msg) => {
      if (msg?.metadata && !msg.ai_data) {
        return {
          ...msg,
          ai_data: {
            sql: msg.metadata.sql,
            results: msg.metadata.results,
            export_url: msg.metadata.export_url,
            error: msg.metadata.error,
          },
        };
      }
      return msg;
    });

  useEffect(() => {
    if (waitingForAI && selectedConversation && accessToken && endpoints) {
      const pollForAIResponse = async () => {
        try {
          const url = endpoints.conversationHistory(selectedConversation.id);
          const res = await fetch(url, {
            method: 'GET',
            headers: authHeaders,
          });
          if (!res.ok) {
            const text = await res.text();
            console.warn('AI polling failed:', res.status, url, text.slice(0, 200));
            return;
          }
          const rawData = await parseJsonSafe(res, url);
          const data = transformMessages(rawData || []);
          const hasAIResponse = data.some(
            (m) =>
              (m.sender_type === 'ai' || m.sender_type === 'bot') &&
              !messages.some((existing) => existing.id === m.id)
          );

          if (hasAIResponse) {
            const aiMessages = data.filter((m) => m.sender_type === 'ai' || m.sender_type === 'bot');
            const latestAi = aiMessages[aiMessages.length - 1];
            if (latestAi) {
              console.log('AI polling response:', latestAi);
            }
            setMessages(data);
            setWaitingForAI(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      };

      aiPollingRef.current = setInterval(pollForAIResponse, 3000);
      pollForAIResponse();

      return () => {
        if (aiPollingRef.current) {
          clearInterval(aiPollingRef.current);
          aiPollingRef.current = null;
        }
      };
    }
  }, [waitingForAI, selectedConversation?.id, accessToken, messages, authHeaders, endpoints]);


  useEffect(() => {
    if (selectedConversation && wsBase) {
      console.log('Chat WebSocket base:', wsBase, 'conversation:', selectedConversation.id);
      connectWebSocket(selectedConversation.id);
    } else if (selectedConversation && !wsBase) {
      console.warn('Chat WebSocket base missing for conversation:', selectedConversation.id);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedConversation, wsBase]);

  const connectWebSocket = (conversationId) => {
    try {
      if (!wsBase) return;
      const wsUrl = `${wsBase}/ws/chat/${conversationId}/`;
      console.log('Chat WebSocket connect:', wsUrl);
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        console.log('Chat WebSocket connected');
        setWsConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message' && data.message) {
            const msg = data.message;
            if (msg.sender_type === 'ai' || msg.sender_type === 'bot') {
              console.log('AI WebSocket response:', msg);
            }
            const newMessage = {
              id: msg.id,
              conversation: msg.conversation || msg.conversation_id,
              sender_type: msg.sender_type,
              sender_name: msg.sender_name,
              content: msg.content,
              message_type: msg.message_type,
              created_at: msg.created_at,
              is_read: msg.is_read,
              attachments: msg.attachments || [],
              ai_data: msg.metadata ? {
                sql: msg.metadata.sql,
                results: msg.metadata.results_summary || msg.metadata.results,
                export_url: msg.metadata.export_url,
                error: msg.metadata.error,
              } : undefined,
            };

            setMessages((prev) => {
              const isAIResponse = msg.sender_type === 'ai' || msg.sender_type === 'bot';
              if (isAIResponse) setWaitingForAI(false);

              const withoutThinking = isAIResponse
                ? prev.filter((m) => !String(m.id || '').startsWith('thinking-'))
                : prev;

              const tempIndex = withoutThinking.findIndex(
                (m) => String(m.id || '').startsWith('temp-') &&
                  m.content === msg.content &&
                  m.sender_type === 'client'
              );

              if (tempIndex >= 0) {
                const tempMsg = withoutThinking[tempIndex];
                const messageToUse = {
                  ...newMessage,
                  attachments: (msg.attachments && msg.attachments.length > 0)
                    ? msg.attachments
                    : (tempMsg.attachments || []),
                };
                return [
                  ...withoutThinking.slice(0, tempIndex),
                  messageToUse,
                  ...withoutThinking.slice(tempIndex + 1),
                ];
              }

              const existingIndex = withoutThinking.findIndex((m) => m.id === msg.id);
              if (existingIndex >= 0) {
                const existingMsg = withoutThinking[existingIndex];
                const hasNewAttachments = msg.attachments && msg.attachments.length > 0;
                const existingHasAttachments = existingMsg.attachments && existingMsg.attachments.length > 0;
                const existingArePreview = existingHasAttachments &&
                  existingMsg.attachments?.some((a) => {
                    const fileUrl = String(a?.file_url || '');
                    return fileUrl.startsWith('file:') || fileUrl.startsWith('content:');
                  });

                if (hasNewAttachments && (!existingHasAttachments || existingArePreview ||
                  JSON.stringify(existingMsg.attachments) !== JSON.stringify(msg.attachments))) {
                  return [
                    ...withoutThinking.slice(0, existingIndex),
                    newMessage,
                    ...withoutThinking.slice(existingIndex + 1),
                  ];
                }
                return withoutThinking;
              }
              return [...withoutThinking, newMessage];
            });

            setTimeout(() => forceUpdate({}), 10);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      ws.onerror = (e) => {
        console.warn('Chat WebSocket error:', e?.message || e);
        setWsConnected(false);
      };
      ws.onclose = (e) => {
        console.warn('Chat WebSocket closed:', e?.code, e?.reason);
        setWsConnected(false);
      };
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && accessToken && endpoints) {
      loadConversations();
    }
  }, [isOpen, isAuthenticated, accessToken, endpoints]);

  useEffect(() => {
    if (selectedConversation && accessToken && endpoints) {
      if (loadedConversationRef.current !== selectedConversation.id) {
        loadedConversationRef.current = selectedConversation.id;
        loadMessages(selectedConversation.id);
      }
    } else if (!selectedConversation && loadedConversationRef.current !== null) {
      setMessages([]);
      loadedConversationRef.current = null;
    }
  }, [selectedConversation?.id, accessToken, endpoints]);

  useEffect(() => {
    messagesEndRef.current?.scrollToEnd?.({ animated: true });
  }, [messages, sending, uploadingAttachments]);

  const loadConversations = async () => {
    try {
      if (!accessToken || !endpoints) return;
      const res = await fetch(endpoints.conversations, {
        method: 'GET',
        headers: authHeaders,
      });
      const data = await res.json();
      setConversations(normalizeList(data));
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      if (!accessToken || !endpoints) return;
      const res = await fetch(endpoints.conversationHistory(conversationId), {
        method: 'GET',
        headers: authHeaders,
      });
      const rawData = await res.json();
      const data = transformMessages(rawData || []);
      if (loadedConversationRef.current === conversationId) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleFileSelect = (files) => {
    setPendingAttachments((prev) => [...prev, ...files]);
  };

  const handleRemovePendingAttachment = (attachmentId) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const uploadAttachments = async (messageId) => {
    for (const attachment of pendingAttachments) {
      try {
        const formData = new FormData();
        formData.append('file', {
          uri: attachment.file.uri,
          name: attachment.file.name,
          type: attachment.file.type,
        });
        formData.append('message_id', messageId);

        const uploadHeaders = { accept: 'application/json', access_token: accessToken || '' };
        if (accessToken) uploadHeaders.Authorization = `Bearer ${accessToken}`;
        if (!endpoints) return;
        await fetch(endpoints.uploadAttachment, {
          method: 'POST',
          headers: uploadHeaders,
          body: formData,
        });
      } catch (error) {
        console.error('Failed to upload attachment:', attachment.file.name, error);
      }
    }
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id);
    }
  };

  const handleSendMessage = async (overrideText) => {
    const safeOverride = typeof overrideText === 'string' ? overrideText : undefined;
    const trimmedText = String(safeOverride ?? messageRef.current ?? message).trim();
    if ((!trimmedText && pendingAttachments.length === 0) || !accessToken || sending || !endpoints) return;

    const hasAttachments = pendingAttachments.length > 0;
    const messageContent = trimmedText || (hasAttachments ? `📎 ${pendingAttachments.length} file(s)` : '');

    try {
      setSending(true);

      if (!selectedConversation) {
        setShowTypeSelector(true);
        pendingTypeMessageRef.current = messageContent;
        setMessage('');
        return;
      }

      setMessage('');
      setUploadingAttachments(hasAttachments);

      if (selectedConversation.conversation_type === 'ai') {
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversation: selectedConversation.id,
          sender_type: 'client',
          sender_name: userName || 'You',
          content: messageContent,
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: false,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const thinkingMessage = {
          id: `thinking-${Date.now()}`,
          conversation: selectedConversation.id,
          sender_type: 'agent',
          sender_name: 'AI Assistant',
          content: 'AI Agent is thinking...',
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: true,
        };

        setTimeout(() => {
          setMessages((prev) => [...prev, thinkingMessage]);
          setWaitingForAI(true);
        }, 300);

        if (wsRef.current?.readyState === 1) {
          console.log('AI send via WebSocket:', selectedConversation.id);
          wsRef.current.send(JSON.stringify({
            type: 'chat_message',
            content: messageContent,
            message_type: 'text',
          }));
        } else {
          console.warn('WebSocket not connected for AI send:', wsRef.current?.readyState, {
            wsBase,
            conversationId: selectedConversation.id,
            wsUrl: wsBase ? `${wsBase}/ws/chat/${selectedConversation.id}/` : '',
          });
          setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id && m.id !== thinkingMessage.id));
          setWaitingForAI(false);
        }
      } else {
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversation: selectedConversation.id,
          sender_type: 'client',
          sender_name: userName || 'You',
          content: messageContent,
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: false,
          attachments: hasAttachments ? pendingAttachments.map((a) => ({
            id: a.id,
            file_name: a.file.name,
            file_type: 'other',
            file_size: a.file.size,
            file_url: a.preview || '',
            mime_type: a.file.type,
            uploaded_at: new Date().toISOString(),
          })) : undefined,
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        const res = await fetch(endpoints.sendMessage(selectedConversation.id), {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ content: messageContent, message_type: 'text' }),
        });
        const sentMessage = await res.json();
        if (hasAttachments && sentMessage && sentMessage.id) {
          await uploadAttachments(sentMessage.id);
        }

        setPendingAttachments([]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
      setUploadingAttachments(false);
    }
  };

  const startRecording = async () => {
    if (!micGranted) {
      Alert.alert('Microphone Permission', 'Enable microphone access in settings to use voice chat.');
      return;
    }
    if (recording) return;
    try {
      const beep = beepRef.current;
      if (beep) {
        beep.stop(() => beep.play());
      }
      setRecording(true);
      await Voice.start('en-US');
    } catch {
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      voiceAutoSendRef.current = true;
      await Voice.stop();
    } finally {
      setRecording(false);
    }
    setTimeout(() => {
      if (!voiceAutoSendRef.current) return;
      voiceAutoSendRef.current = false;
      const latestText = String(messageRef.current || '').trim();
      if (!latestText) return;
      const needsTypeSelection = showTypeSelectorRef.current || !selectedConversationRef.current;
      if (needsTypeSelection) {
        pendingTypeMessageRef.current = latestText;
        setShowTypeSelector(true);
        return;
      }
      handleSendMessage(latestText);
    }, 350);
  };

  const handleTypeSelection = async (type) => {
    try {
      if (!accessToken || !endpoints) return;
      const messageContent = (pendingTypeMessageRef.current || message).trim();
      setSending(true);

      console.log('Chat createConversation URL:', endpoints.createConversation);
      const res = await fetch(endpoints.createConversation, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          subject: type === 'ai' ? 'AI Query' : 'Support Request',
          content: messageContent,
          conversation_type: type,
        }),
      });
      const rawConversation = await parseJsonSafe(res, endpoints.createConversation);
      const conversation =
        rawConversation?.conversation ||
        rawConversation?.data ||
        rawConversation?.result ||
        rawConversation;
      const conversationId = conversation?.id || rawConversation?.id;
      if (!conversationId) {
        console.warn('Chat createConversation missing id:', rawConversation);
      }

      const updatedRes = await fetch(endpoints.conversations, {
        method: 'GET',
        headers: authHeaders,
      });
      const updatedConversations = await parseJsonSafe(updatedRes, endpoints.conversations);
      const list = normalizeList(updatedConversations);
      setConversations(list);
      const newConv = list.find((c) => String(c.id) === String(conversationId));
      if (newConv || conversationId) {
        const fallbackConv = newConv || {
          id: conversationId,
          subject: conversation?.subject || (type === 'ai' ? 'AI Query' : 'Support Request'),
          status: conversation?.status || 'open',
          created_at: conversation?.created_at || new Date().toISOString(),
          last_message_at: conversation?.last_message_at || new Date().toISOString(),
          message_count: conversation?.message_count ?? 0,
          conversation_type: conversation?.conversation_type || type,
        };
        setSelectedConversation(fallbackConv);
        const msgsRes = await fetch(endpoints.conversationHistory(conversationId), {
          method: 'GET',
          headers: authHeaders,
        });
        const msgs = await parseJsonSafe(msgsRes, endpoints.conversationHistory(conversationId));
        setMessages(transformMessages(msgs || []));
        if (!newConv && conversationId) {
          setConversations((prev) => [fallbackConv, ...prev]);
        }
      }

      setShowTypeSelector(false);
      setMessage('');
      pendingTypeMessageRef.current = '';
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSwitchAgent = async () => {
    setSwitchingAgent(true);
    setShowTypeSelector(true);
    setSelectedConversation(null);
    setMessages([]);
    setWaitingForAI(false);
    setSwitchingAgent(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const openExport = async (url) => {
    const full = String(url || '').startsWith('http') ? url : `${apiBase}${url}`;
    if (await Linking.canOpenURL(full)) {
      Linking.openURL(full);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <View pointerEvents="box-none" style={[styles.container, style]}>
      {!isOpen && (
        <TouchableOpacity style={[styles.fab, buttonStyle]} onPress={() => setIsOpen(true)} activeOpacity={0.9}>
          <Icon name="support-agent" size={30} color="#fff" />
        </TouchableOpacity>
      )}

      <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.backdrop} />
        <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.sheetWrap}>
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>
                  {selectedConversation ? selectedConversation.subject || 'Support Chat' : 'Support Chat'}
                </Text>
                <Text style={styles.headerSubtitle}>{userName}</Text>
              </View>
              <View style={styles.headerActions}>
                {selectedConversation && (
                  <TouchableOpacity
                    style={[styles.headerBtn, switchingAgent && styles.headerBtnDisabled]}
                    onPress={handleSwitchAgent}
                    disabled={switchingAgent}
                  >
                    <Text style={styles.headerBtnText}>Switch</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.headerBtn} onPress={() => setIsOpen(false)}>
                  <Text style={styles.headerBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.messagesPanel}>
              {showTypeSelector ? (
                <ConversationTypeSelector
                  onSelect={handleTypeSelection}
                  onCancel={() => {
                    setShowTypeSelector(false);
                    setMessage('');
                    setSending(false);
                  }}
                />
              ) : !selectedConversation ? (
                <ScrollView contentContainerStyle={styles.emptyWrap}>
                  {conversations.filter((c) => c.status !== 'closed' && c.status !== 'resolved').length > 0 ? (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.emptyTitle}>Select a conversation</Text>
                      {conversations
                        .filter((c) => c.status !== 'closed' && c.status !== 'resolved')
                        .map((conv) => (
                          <TouchableOpacity
                            key={conv.id}
                            style={styles.conversationCard}
                            onPress={() => setSelectedConversation(conv)}
                          >
                            <View style={styles.conversationRow}>
                              <Text style={styles.conversationTitle}>{conv.subject || 'Support Request'}</Text>
                              {conv.conversation_type === 'ai' && (
                                <Text style={styles.aiBadge}>AI</Text>
                              )}
                            </View>
                            <Text style={styles.conversationMeta}>{conv.message_count} messages</Text>
                          </TouchableOpacity>
                        ))}
                      <TouchableOpacity
                        style={styles.startBtn}
                        onPress={() => {
                          setSelectedConversation(null);
                          setMessages([]);
                          setShowTypeSelector(true);
                          setWaitingForAI(false);
                        }}
                      >
                        <Text style={styles.startBtnText}>Start New Conversation</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 6 }}>
                      <Text style={styles.emptyTitle}>Start a conversation</Text>
                      <Text style={styles.emptyText}>Type your message below to begin</Text>
                    </View>
                  )}
                </ScrollView>
              ) : (
                <ScrollView
                  ref={messagesEndRef}
                  contentContainerStyle={{ paddingVertical: 8 }}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map((msg) => {
                    const isClient = msg.sender_type === 'client';
                    const isAI = (msg.sender_type === 'bot' || msg.sender_type === 'ai') &&
                      selectedConversation?.conversation_type === 'ai';
                    const isThinking = String(msg.id || '').startsWith('thinking-');
                    return (
                      <View key={msg.id} style={[styles.messageRow, isClient && styles.messageRowRight]}>
                        <View style={[
                          styles.messageBubble,
                          isClient ? styles.clientBubble : styles.otherBubble,
                          isAI && styles.aiBubble,
                        ]}>
                          {isThinking ? (
                            <View style={styles.thinkingRow}>
                              <ActivityIndicator size="small" color="#7c3aed" />
                              <Text style={styles.thinkingText}>AI Agent is thinking...</Text>
                            </View>
                          ) : (
                            <Text style={isClient ? styles.clientText : styles.otherText}>{msg.content}</Text>
                          )}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <View style={{ marginTop: 8 }}>
                              <AttachmentPreview attachments={msg.attachments} showActions layout="list" baseUrl={attachmentBase} />
                            </View>
                          )}

                          {msg.ai_data?.export_url && msg.ai_data.results?.total_rows > 5 && (
                            <View style={styles.exportCard}>
                              <Text style={styles.exportText}>
                                Download Excel ({msg.ai_data.results?.total_rows?.toLocaleString()} records)
                              </Text>
                              <TouchableOpacity
                                style={styles.exportBtn}
                                onPress={() => openExport(msg.ai_data.export_url)}
                              >
                                <Text style={styles.exportBtnText}>Open</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          <Text style={isClient ? styles.timeTextClient : styles.timeText}>
                            {formatTime(msg.created_at)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputWrap}>
              {pendingAttachments.length > 0 && (
                <View style={styles.pendingWrap}>
                  <View style={styles.pendingHeader}>
                    <Text style={styles.pendingTitle}>Attachments ({pendingAttachments.length})</Text>
                    <TouchableOpacity onPress={() => setPendingAttachments([])}>
                      <Text style={styles.pendingClear}>Clear all</Text>
                    </TouchableOpacity>
                  </View>
                  {pendingAttachments.map((att) => (
                    <View key={att.id} style={styles.pendingRow}>
                      <Text numberOfLines={1} style={styles.pendingName}>
                        {att.file.name}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemovePendingAttachment(att.id)}>
                        <Text style={styles.pendingRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.inputRow}>
                {showAttachments && (
                  <AttachmentButton
                    onFileSelect={handleFileSelect}
                    disabled={uploadingAttachments || sending}
                  />
                )}
                <View style={styles.inputWrapInner}>
                  <TextInput
                    style={[styles.input, styles.inputWithMic]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type your message..."
                    placeholderTextColor="#9CA3AF"
                    editable={!sending && !uploadingAttachments}
                    returnKeyType="send"
                    blurOnSubmit={false}
                    onSubmitEditing={() => handleSendMessage()}
                  />
                  <TouchableOpacity
                    style={[styles.micIconBtn, recording && styles.micIconBtnActive]}
                    onPressIn={startRecording}
                    onPressOut={stopRecording}
                    disabled={sending || uploadingAttachments}
                  >
                    <Icon name="mic" size={20} color={recording ? '#166534' : '#111'} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.sendBtn, (sending || uploadingAttachments) && styles.sendBtnDisabled]}
                  onPress={() => handleSendMessage()}
                  disabled={(!message.trim() && pendingAttachments.length === 0) || sending || uploadingAttachments}
                >
                  <Text style={styles.sendBtnText}>
                    {uploadingAttachments ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
                  </Text>
                </TouchableOpacity>
              </View>
              {recording && (
                <View style={styles.recordingRow}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording…</Text>
                </View>
              )}
              {!wsConnected && selectedConversation && (
                <Text style={styles.wsStatus}>Reconnecting…</Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 90, right: 16 },
  fab: {
    backgroundColor: '#16A34A',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sheet: {
    height: '80%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  headerBtnDisabled: { opacity: 0.6 },
  headerBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  messagesPanel: { flex: 1, backgroundColor: '#F5F5F5' },
  emptyWrap: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#666', textAlign: 'center' },
  conversationCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  conversationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conversationTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  conversationMeta: { fontSize: 12, color: '#666', marginTop: 4 },
  aiBadge: { fontSize: 10, fontWeight: '700', color: '#6D28D9', backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  startBtn: { backgroundColor: '#16A34A', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: '700' },

  messageRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10 },
  messageRowRight: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '85%', borderRadius: 12, padding: 10, backgroundColor: '#fff' },
  clientBubble: { backgroundColor: '#16A34A' },
  otherBubble: { backgroundColor: '#fff' },
  aiBubble: { borderWidth: 1, borderColor: '#E9D5FF', backgroundColor: '#F5F3FF' },
  clientText: { color: '#fff', fontSize: 13 },
  otherText: { color: '#111', fontSize: 13 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { color: '#6D28D9', fontSize: 13 },
  timeText: { marginTop: 6, fontSize: 10, color: '#666' },
  timeTextClient: { marginTop: 6, fontSize: 10, color: 'rgba(255,255,255,0.7)' },

  exportCard: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  exportText: { fontSize: 11, color: '#4C1D95', marginBottom: 6 },
  exportBtn: { alignSelf: 'flex-start', backgroundColor: '#16A34A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  exportBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  inputWrap: { borderTopWidth: 1, borderTopColor: '#E5E7EB', padding: 10, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputWrapInner: { flex: 1, position: 'relative' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#111' },
  inputWithMic: { paddingRight: 38 },
  sendBtn: { backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  micIconBtn: {
    position: 'absolute',
    right: 8,
    top: 6,
    bottom: 6,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  micIconBtnActive: { backgroundColor: '#DCFCE7' },
  recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  recordingDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#DC2626' },
  recordingText: { fontSize: 11, color: '#DC2626', fontWeight: '600' },
  wsStatus: { marginTop: 6, fontSize: 11, color: '#9CA3AF' },

  typeSelector: {
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    margin: 12,
  },
  typeTitle: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111' },
  typeSubtitle: { textAlign: 'center', fontSize: 12, color: '#6B7280' },
  typeCard: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 12,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardBody: { flex: 1 },
  typeCardTitle: { fontSize: 14, fontWeight: '700', color: '#111' },
  typeCardText: { marginTop: 2, fontSize: 12, color: '#4B5563' },
  typeCardAction: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeCardActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  typeBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeAi: { backgroundColor: '#ECFDF5' },
  typeSupport: { backgroundColor: '#16A34A' },
  typeCancel: { backgroundColor: '#F3F4F6' },
  typeBtnText: { color: '#fff', fontWeight: '700' },
  typeCancelText: { color: '#111', fontWeight: '600' },

  pendingWrap: { marginBottom: 10, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, gap: 6 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingTitle: { fontSize: 12, fontWeight: '700', color: '#111' },
  pendingClear: { fontSize: 11, color: '#DC2626' },
  pendingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pendingName: { flex: 1, fontSize: 12, color: '#111', marginRight: 8 },
  pendingRemove: { fontSize: 11, color: '#DC2626' },
});
