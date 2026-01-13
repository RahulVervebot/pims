import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendChatAIQuery } from '../functions/ChatAIAPI';

const THEME_COLOR = '#319241';
const THEME_LIGHT = 'rgba(244, 255, 246, 1)';
const THEME_BORDER = 'rgba(49, 146, 65, 0.2)';
const TEXT_COLOR = '#111';

const STORAGE_KEY = 'chat_ai_messages';
const STORAGE_UPDATED_KEY = 'chat_ai_last_updated';
const CLEAR_AFTER_MS = 24 * 60 * 60 * 1000;

const asConversationHistory = (messages) =>
  messages.map((m) => ({ role: m.role, content: m.text }));

export default function ChatAI({
  title = 'AI Chat',
  floating = true,
  style,
  buttonStyle,
}) {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = Math.round(windowHeight * 0.7);

  const canSend = input.trim().length > 0 && !loading;

  const loadHistory = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet([STORAGE_KEY, STORAGE_UPDATED_KEY]);
      const rawMessages = entries?.[0]?.[1];
      const updatedAt = Number(entries?.[1]?.[1] || 0);

      if (updatedAt && Date.now() - updatedAt > CLEAR_AFTER_MS) {
        await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_UPDATED_KEY]);
        setMessages([]);
        setHydrated(true);
        return;
      }

      if (rawMessages) {
        const parsed = JSON.parse(rawMessages);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('ChatAI history load failed:', e);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (visible) loadHistory();
  }, [visible, loadHistory]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        await AsyncStorage.setItem(STORAGE_UPDATED_KEY, String(Date.now()));
      } catch (e) {
        console.warn('ChatAI history save failed:', e);
      }
    })();
  }, [messages, hydrated]);

  useEffect(() => {
    if (!scrollRef.current) return;
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, loading]);

  const handleClear = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setMessages([]);
    setInput('');
    await AsyncStorage.multiRemove([STORAGE_KEY, STORAGE_UPDATED_KEY]);
  }, []);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || loading) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: query,
      ts: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const response = await sendChatAIQuery({
        query,
        conversationHistory: asConversationHistory([...messages, userMessage]),
        signal: controller.signal,
      });

      const responseText =
        response?.response ||
        response?.result ||
        response?.message ||
        (typeof response === 'string' ? response : JSON.stringify(response));

      const aiMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        text: responseText || 'No response received.',
        ts: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (e) {
      if (e?.name === 'AbortError') {
        return;
      }
      const aiMessage = {
        id: `${Date.now()}-assistant-error`,
        role: 'assistant',
        text: e?.message || 'Chat request failed.',
        ts: Date.now(),
        error: true,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  }, [input, loading, messages]);

  const containerStyle = useMemo(
    () => [styles.floatingWrap, !floating && styles.inlineWrap, style],
    [floating, style]
  );

  return (
    <View pointerEvents="box-none" style={containerStyle}>
      {!visible && (
        <TouchableOpacity
          style={[styles.fab, buttonStyle]}
          onPress={() => setVisible(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.fabIcon}>i</Text>
          <Text style={styles.fabText}>Chat</Text>
        </TouchableOpacity>
      )}

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop} />
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { height: sheetHeight }]}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>Ask anything about your store.</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleClear} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setVisible(false)} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.messagePanel}>
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={[
                  styles.messagesContent,
                  messages.length === 0 && !loading ? styles.messagesEmpty : null,
                ]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {messages.length === 0 && !loading ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>Start a conversation</Text>
                    <Text style={styles.emptyText}>
                      Ask about products, categories, pricing, or anything else. Your AI assistant will reply here.
                    </Text>
                  </View>
                ) : null}

                {messages.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      styles.bubble,
                      m.role === 'user' ? styles.userBubble : styles.aiBubble,
                      m.error ? styles.errorBubble : null,
                    ]}
                  >
                    <Text style={m.role === 'user' ? styles.userText : styles.aiText}>{m.text}</Text>
                  </View>
                ))}

                {loading && (
                  <View style={[styles.bubble, styles.aiBubble, styles.typingBubble]}>
                    <ActivityIndicator size="small" color={THEME_COLOR} />
                    <Text style={styles.typingText}>Typing...</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="Type your question..."
                placeholderTextColor={TEXT_COLOR}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                disabled={!canSend}
                onPress={handleSend}
              >
                <Text style={styles.sendButtonText}>{loading ? '...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    zIndex: 9999,
  },
  inlineWrap: {
    position: 'relative',
    right: 0,
    bottom: 0,
  },
  fab: {
    backgroundColor: THEME_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabIcon: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.45)',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  fabText: { color: '#fff', fontWeight: '700' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: THEME_LIGHT,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '100%',
    paddingBottom: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME_BORDER,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: THEME_LIGHT,
    borderWidth: 1,
    borderColor: THEME_BORDER,
  },
  headerButtonText: {
    color: TEXT_COLOR,
    fontWeight: '700',
    fontSize: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_COLOR },
  subtitle: { fontSize: 12, color: TEXT_COLOR, marginTop: 4 },
  messagePanel: {
    minHeight: '80%',
    flex: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME_BORDER,
    padding: 12,
  },
  messagesContent: {
    gap: 10,
    paddingBottom: 6,
    flexGrow: 1,
  },
  messagesEmpty: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  userBubble: {
    backgroundColor: THEME_COLOR,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: THEME_LIGHT,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    backgroundColor: '#FCE3E3',
  },
  userText: { color: '#fff', fontSize: 14 },
  aiText: { color: TEXT_COLOR, fontSize: 14 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: { color: TEXT_COLOR, fontSize: 12 },
  emptyCard: {
    backgroundColor: THEME_LIGHT,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME_BORDER,
    gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: TEXT_COLOR, textAlign: 'center' },
  emptyText: { fontSize: 13, color: TEXT_COLOR, lineHeight: 18, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME_BORDER,
    gap: 10,
    alignItems: 'flex-end',
    backgroundColor: THEME_LIGHT,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    color: TEXT_COLOR,
    borderWidth: 1,
    borderColor: THEME_BORDER,
  },
  sendButton: {
    backgroundColor: THEME_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(49, 146, 65, 0.45)',
  },
  sendButtonText: { color: '#fff', fontWeight: '700' },
});
