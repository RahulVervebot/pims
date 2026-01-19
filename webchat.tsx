'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiService, MessageResponse } from '@/lib/api';
import ConversationTypeSelector from './ConversationTypeSelector';
import AIMessageDisplay from './AIMessageDisplay';
import { ArrowLeftRight, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AttachmentButton, { AttachmentFile } from './AttachmentButton';
import AttachmentPreview, { Attachment } from './AttachmentPreview';

interface Conversation {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string;
  message_count: number;
  conversation_type?: 'support' | 'ai';
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8002';
const AI_WELCOME_MESSAGE = "Hi! I am Widgetly AI Agent. I am here to give information about your POS. Ask me anything about your POS data!";

export default function FloatingChatWidget() {
  const { user, accessToken } = useAuthStore();
  const isAuthenticated = !!(user && accessToken);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [switchingAgent, setSwitchingAgent] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [, forceUpdate] = useState({});
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentFile[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [waitingForAI, setWaitingForAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const loadedConversationRef = useRef<string | null>(null);
  const aiPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Show attachments for support conversations only
  const showAttachments = selectedConversation?.conversation_type !== 'ai';

  // Helper function to transform API messages to include ai_data from metadata
  const transformMessages = (messages: MessageResponse[]): MessageResponse[] => {
    return messages.map(msg => {
      // If message has metadata but no ai_data, transform it
      const msgWithMetadata = msg as MessageResponse & { metadata?: any };
      if (msgWithMetadata.metadata && !msg.ai_data) {
        return {
          ...msg,
          ai_data: {
            sql: msgWithMetadata.metadata.sql,
            results: msgWithMetadata.metadata.results,
            export_url: msgWithMetadata.metadata.export_url,
            error: msgWithMetadata.metadata.error
          }
        };
      }
      return msg;
    });
  };

  // Poll for messages while waiting for AI response (fallback for WebSocket issues)
  useEffect(() => {
    if (waitingForAI && selectedConversation && accessToken) {
      console.log('🔄 Starting AI response polling...');
      
      const pollForAIResponse = async () => {
        try {
          console.log('🔄 Polling for AI response...');
          const rawData = await apiService.getConversationHistory(selectedConversation.id, accessToken);
          const data = transformMessages(rawData);
          
          // Check if we got an AI response (message from 'ai' or 'bot' that's newer than our query)
          const hasAIResponse = data.some((m: MessageResponse) => 
            (m.sender_type === 'ai' || m.sender_type === 'bot') &&
            !messages.some(existing => existing.id === m.id)
          );
          
          if (hasAIResponse) {
            console.log('✅ AI response received via polling!');
            // Remove thinking indicator and update messages
            setMessages(data);
            setWaitingForAI(false);
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      };
      
      // Poll every 3 seconds
      aiPollingRef.current = setInterval(pollForAIResponse, 3000);
      
      // Also poll immediately
      pollForAIResponse();
      
      return () => {
        if (aiPollingRef.current) {
          clearInterval(aiPollingRef.current);
          aiPollingRef.current = null;
        }
      };
    }
  }, [waitingForAI, selectedConversation?.id, accessToken]);

  // Connect to WebSocket when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      connectWebSocket(selectedConversation.id);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [selectedConversation]);

  const connectWebSocket = (conversationId: string) => {
    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${conversationId}/`);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📩 Raw WebSocket data received:', JSON.stringify(data).substring(0, 200));
          console.log('📩 Full message object:', data.message);
          
          if (data.type === 'chat_message' && data.message) {
            const msg = data.message;
            console.log('📩 WebSocket message received:', {
              id: msg.id,
              sender_type: msg.sender_type,
              message_type: msg.message_type,
              has_metadata: !!msg.metadata,
              metadata_keys: msg.metadata ? Object.keys(msg.metadata) : [],
              content_preview: msg.content?.substring(0, 100) + '...'
            });
            
            // Build proper message object
            const newMessage: MessageResponse = {
              id: msg.id,
              conversation: msg.conversation || msg.conversation_id,
              sender: msg.sender || (msg.sender_id ? {
                id: msg.sender_id,
                email: '',
                first_name: msg.sender_name?.split(' ')[0] || '',
                last_name: msg.sender_name?.split(' ').slice(1).join(' ') || '',
              } : null),
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
                error: msg.metadata.error
              } : undefined,
            };
            
            console.log('✅ Built message object:', {
              id: newMessage.id.substring(0, 15),
              sender_type: newMessage.sender_type,
              has_ai_data: !!newMessage.ai_data,
              has_attachments: !!(newMessage.attachments && newMessage.attachments.length > 0),
              attachments_count: newMessage.attachments?.length || 0,
              ai_data: newMessage.ai_data
            });
            
            // Update messages: replace temp/thinking or add new
            setMessages(prev => {
              console.log('📊 Current messages before update:', prev.length);
              console.log('📊 Message IDs:', prev.map(m => `${m.id.substring(0, 15)}(${m.sender_type})`).join(', '));
              
              // Only remove thinking indicator when AI/bot response comes in
              // Keep thinking indicator for client message echoes
              const isAIResponse = msg.sender_type === 'ai' || msg.sender_type === 'bot';
              
              // Stop AI polling if we got an AI response via WebSocket
              if (isAIResponse) {
                console.log('✅ AI response received via WebSocket, stopping polling');
                setWaitingForAI(false);
              }
              
              const withoutThinking = isAIResponse 
                ? prev.filter(m => !m.id.startsWith('thinking-'))
                : prev;
              console.log('📊 Is AI response:', isAIResponse, 'After processing thinking:', withoutThinking.length);
              
              // Check if replacing temp message with same content
              const tempIndex = withoutThinking.findIndex(m => 
                m.id.startsWith('temp-') && m.content === msg.content && m.sender_type === 'client'
              );
              
              if (tempIndex >= 0) {
                // Replace temp with real message
                // IMPORTANT: Keep temp's attachments if real message doesn't have any yet (uploads still in progress)
                const tempMsg = withoutThinking[tempIndex];
                const messageToUse = {
                  ...newMessage,
                  attachments: (msg.attachments && msg.attachments.length > 0) 
                    ? msg.attachments 
                    : (tempMsg.attachments || [])
                };
                
                console.log('✅ Replacing temp message at index:', tempIndex, {
                  temp_has_attachments: !!(tempMsg.attachments && tempMsg.attachments.length > 0),
                  real_has_attachments: !!(msg.attachments && msg.attachments.length > 0),
                  keeping_temp_attachments: !msg.attachments || msg.attachments.length === 0,
                  final_attachments_count: messageToUse.attachments?.length || 0
                });
                
                const result = [
                  ...withoutThinking.slice(0, tempIndex),
                  messageToUse,
                  ...withoutThinking.slice(tempIndex + 1)
                ];
                console.log('📊 Messages after replace:', result.length);
                return result;
              }
              
              // Check if message already exists (need to update it with attachments)
              const existingIndex = withoutThinking.findIndex(m => m.id === msg.id);
              
              if (existingIndex >= 0) {
                // Message exists - check if we need to update it with attachments
                const existingMsg = withoutThinking[existingIndex];
                const hasNewAttachments = msg.attachments && msg.attachments.length > 0;
                const existingHasAttachments = existingMsg.attachments && existingMsg.attachments.length > 0;
                
                // Check if existing are preview attachments (blob: URLs)
                const existingArePreview = existingHasAttachments && 
                  existingMsg.attachments?.some((a: any) => a.file_url?.startsWith('blob:'));
                
                // Update if: new attachments and (none before OR existing are previews OR attachments changed)
                if (hasNewAttachments && (!existingHasAttachments || existingArePreview ||
                    JSON.stringify(existingMsg.attachments) !== JSON.stringify(msg.attachments))) {
                  console.log('✅ Updating existing message with attachments:', {
                    id: msg.id.substring(0, 15),
                    new_attachments_count: msg.attachments.length,
                    existing_attachments_count: existingMsg.attachments?.length || 0,
                    existing_are_preview: existingArePreview
                  });
                  // Replace existing message with updated one
                  const result = [
                    ...withoutThinking.slice(0, existingIndex),
                    newMessage,
                    ...withoutThinking.slice(existingIndex + 1)
                  ];
                  console.log('📊 Messages after attachment update:', result.length);
                  return result;
                }
                
                console.log('⚠️ Message already exists, no updates needed:', {
                  id: msg.id.substring(0, 15),
                  has_new_attachments: !!(msg.attachments && msg.attachments.length > 0),
                  has_existing_attachments: !!(existingMsg.attachments && existingMsg.attachments.length > 0)
                });
                return withoutThinking;
              }
              
              // Add new message if it doesn't exist
              console.log('✅ Adding new message, id:', msg.id.substring(0, 15), 'sender:', msg.sender_type);
              const result = [...withoutThinking, newMessage];
              console.log('📊 Messages after add:', result.length);
              console.log('📊 New message list:', result.map(m => `${m.id.substring(0, 10)}(${m.sender_type})`).join(', '));
              return result;
            });
            
            // Force re-render to ensure UI updates
            setTimeout(() => {
              console.log('🔄 Forcing component re-render');
              forceUpdate({});
            }, 10);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setWsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('⚠️ WebSocket disconnected');
        setWsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated && accessToken) {
      loadConversations();
    }
  }, [isOpen, isAuthenticated, accessToken]);

  useEffect(() => {
    console.log('🔍 Conversation effect triggered. Selected:', selectedConversation?.id);
    
    if (selectedConversation && accessToken) {
      // Only load messages if we haven't loaded this conversation yet
      if (loadedConversationRef.current !== selectedConversation.id) {
        console.log('📥 Loading messages for NEW conversation:', selectedConversation.id);
        loadedConversationRef.current = selectedConversation.id;
        loadMessages(selectedConversation.id);
      } else {
        console.log('⏭️ Conversation already loaded, skipping API call');
      }
    } else if (!selectedConversation && loadedConversationRef.current !== null) {
      // Only clear if we actually HAD a conversation before
      console.log('🧹 Clearing messages - conversation changed to null');
      setMessages([]);
      loadedConversationRef.current = null;
    }
  }, [selectedConversation?.id, accessToken]); // Only watch ID, not the whole object

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    console.log('🎨 RENDER EFFECT: messages changed, count:', messages.length);
  }, [messages]);

  // Remove the problematic welcome message effect completely

  const loadConversations = async () => {
    try {
      if (!accessToken) return;
      console.log('📋 Loading conversations list...');
      const data = await apiService.getUserConversations(accessToken);
      
      // Update conversations list
      setConversations(data);
      console.log('📋 Loaded', data.length, 'conversations');
      
      // CRITICAL: Never change selectedConversation reference during polling
      // This would trigger useEffect and clear messages
      console.log('✅ Conversations updated WITHOUT touching selectedConversation');
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      if (!accessToken) return;
      console.log('📥 Loading messages from API for conversation:', conversationId);
      const rawData = await apiService.getConversationHistory(conversationId, accessToken);
      const data = transformMessages(rawData);
      console.log('📥 Loaded', data.length, 'messages from API');
      
      // Only set if this is still the current conversation
      if (loadedConversationRef.current === conversationId) {
        setMessages(data);
        console.log('✅ Messages set from API');
      } else {
        console.log('⚠️ Conversation changed, skipping API messages');
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleFileSelect = (files: AttachmentFile[]) => {
    setPendingAttachments(prev => [...prev, ...files]);
  };

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const uploadAttachments = async (messageId: string): Promise<void> => {
    console.log('📤 Starting attachment upload for message:', messageId, 'files:', pendingAttachments.length);
    for (const attachment of pendingAttachments) {
      try {
        const formData = new FormData();
        formData.append('file', attachment.file);
        formData.append('message_id', messageId);

        console.log('📤 Uploading file:', attachment.file.name);
        const result = await apiService.uploadAttachment(formData, accessToken!);
        console.log('✅ File uploaded successfully:', attachment.file.name, 'result:', result);
      } catch (error) {
        console.error('❌ Failed to upload attachment:', attachment.file.name, error);
      }
    }
    console.log('✅ All attachments uploaded for message:', messageId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && pendingAttachments.length === 0) || !accessToken) return;

    const hasAttachments = pendingAttachments.length > 0;
    // Use message content, or default text if only sending attachments
    const messageContent = message.trim() || (hasAttachments ? `📎 ${pendingAttachments.length} file(s)` : '');
    
    setMessage(''); // Clear input immediately
    setUploadingAttachments(hasAttachments);

    try {
      setSending(true);
      
      if (!selectedConversation) {
        // Show type selector instead of creating conversation directly
        setShowTypeSelector(true);
        setMessage(message.trim()); // Restore message for after type selection
        return;
      }
      
      // Handle AI conversation
      if (selectedConversation.conversation_type === 'ai') {
        // Add optimistic message
        const optimisticMessage: MessageResponse = {
          id: `temp-${Date.now()}`,
          conversation: selectedConversation.id,
          sender: {
            id: user?.id || '',
            email: user?.email || '',
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
          },
          sender_type: 'client',
          sender_name: user ? `${user.first_name} ${user.last_name}` : 'You',
          content: messageContent,
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: false,
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // For AI conversations, add thinking indicator
        const thinkingMessage: MessageResponse = {
          id: `thinking-${Date.now()}`,
          conversation: selectedConversation.id,
          sender: {
            id: 'ai',
            email: 'ai@widgetly.io',
            first_name: 'AI',
            last_name: 'Assistant',
          },
          sender_type: 'agent',
          sender_name: 'AI Assistant',
          content: '🤔 Analyzing your request and searching the database...',
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: true,
        };
        
        // Add thinking indicator after user message and start polling for AI response
        setTimeout(() => {
          setMessages(prev => [...prev, thinkingMessage]);
          // Start polling as fallback for WebSocket issues (AI queries can take minutes)
          setWaitingForAI(true);
        }, 300);
        
        // For AI conversations, send via WebSocket (not HTTP API)
        // The WebSocket consumer will automatically process AI queries
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'chat_message',
            content: messageContent,
            message_type: 'text'
          }));
          
          console.log('✅ AI message sent via WebSocket, polling started as fallback');
          // Don't remove optimistic message immediately - let WebSocket handle it
        } else {
          console.error('WebSocket not connected for AI conversation');
          setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id || m.id !== thinkingMessage.id));
          setWaitingForAI(false);
        }
        
        // DON'T reload conversations for AI - it interferes with WebSocket updates
        // await loadConversations();
      } else {
        // Handle support conversation (existing logic)
        // Add message optimistically to UI immediately
        const optimisticMessage: MessageResponse = {
          id: `temp-${Date.now()}`,
          conversation: selectedConversation.id,
          sender: {
            id: user?.id || '',
            email: user?.email || '',
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
          },
          sender_type: 'client',
          sender_name: user ? `${user.first_name} ${user.last_name}` : 'You',
          content: messageContent,
          message_type: 'text',
          created_at: new Date().toISOString(),
          is_read: false,
          attachments: hasAttachments ? pendingAttachments.map(a => ({
            id: a.id,
            file_name: a.file.name,
            file_type: 'other' as const,
            file_size: a.file.size,
            file_url: a.preview || '',
            mime_type: a.file.type,
            uploaded_at: new Date().toISOString(),
          })) : undefined,
        };
        
        setMessages(prev => [...prev, optimisticMessage]);
        
        // Send message to server (will be broadcast via WebSocket with real ID)
        const sentMessage = await apiService.sendMessage(
          selectedConversation.id,
          messageContent,
          accessToken
        );
        
        // Upload attachments if any
        if (hasAttachments && sentMessage && sentMessage.id) {
          await uploadAttachments(sentMessage.id);
        }
        
        setPendingAttachments([]);
        // Don't reload conversations immediately - let WebSocket handle updates
        // await loadConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploadingAttachments(false);
    }
  };

  const handleTypeSelection = async (type: 'support' | 'ai') => {
    try {
      if (!accessToken) return;
      
      const messageContent = message.trim();
      setSending(true);
      
      // Create new conversation with selected type
      const conversation = await apiService.createConversation(
        type === 'ai' ? 'AI Query' : 'Support Request',
        messageContent,
        accessToken,
        type
      );
      
      const updatedConversations = await apiService.getUserConversations(accessToken);
      setConversations(updatedConversations);
      const newConv = updatedConversations.find(c => c.id === conversation.id);
      if (newConv) {
        setSelectedConversation(newConv);
        const msgs = await apiService.getConversationHistory(conversation.id, accessToken);
        setMessages(msgs);
      }
      
      setShowTypeSelector(false);
      setMessage('');
    } catch (error) {
      console.error('Failed to create conversation:', error);
      alert('Failed to start conversation. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSwitchAgent = async () => {
    if (!selectedConversation || !accessToken) return;
    
    try {
      setSwitchingAgent(true);
      const newType: 'support' | 'ai' = selectedConversation.conversation_type === 'ai' ? 'support' : 'ai';
      
      await apiService.switchAgent(selectedConversation.id, newType, accessToken);
      
      // Update local state
      const updatedConv: Conversation = { ...selectedConversation, conversation_type: newType };
      setSelectedConversation(updatedConv);
      
      // Update conversations list
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? updatedConv : c)
      );
      
      // Reload messages to get switch notification
      const msgs = await apiService.getConversationHistory(selectedConversation.id, accessToken);
      setMessages(msgs);
      
    } catch (error) {
      console.error('Failed to switch agent:', error);
      alert('Failed to switch agent. Please try again.');
    } finally {
      setSwitchingAgent(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {selectedConversation && conversations.filter(c => c.status !== 'closed' && c.status !== 'resolved').length > 1 && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-white/80 hover:text-white transition-colors"
                  title="Back to conversations"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedConversation?.conversation_type === 'ai' ? 'bg-purple-500' : 'bg-white/20'
              }`}>
                {selectedConversation?.conversation_type === 'ai' ? (
                  <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">
                    {selectedConversation ? selectedConversation.subject || 'Support Chat' : 'Support Chat'}
                  </h3>
                  {selectedConversation?.conversation_type === 'ai' && (
                    <span className="text-xs bg-purple-500 px-2 py-0.5 rounded-full">AI</span>
                  )}
                </div>
                <p className="text-xs text-white/80">{user?.first_name} {user?.last_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedConversation && (
                <button
                  onClick={handleSwitchAgent}
                  disabled={switchingAgent}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  title={`Switch to ${selectedConversation.conversation_type === 'ai' ? 'Support' : 'AI'} Agent`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
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
              <div className="flex items-center justify-center h-full text-center text-gray-500">
                <div className="w-full px-4">
                  {conversations.filter(c => c.status !== 'closed' && c.status !== 'resolved').length > 0 ? (
                    <div>
                      <p className="text-lg font-medium mb-4">Select a conversation</p>
                      <div className="space-y-2 text-left">
                        {conversations
                          .filter(c => c.status !== 'closed' && c.status !== 'resolved')
                          .map((conv) => (
                            <button
                              key={conv.id}
                              onClick={() => setSelectedConversation(conv)}
                              className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900 text-sm">
                                  {conv.subject || 'Support Request'}
                                </div>
                                {conv.conversation_type === 'ai' && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {conv.message_count} messages
                              </div>
                            </button>
                          ))
                        }
                      </div>
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        Start New Conversation
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Start a conversation</p>
                      <p className="text-sm">Type your message below to begin</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isClient = msg.sender_type === 'client';
                  const isAI = (msg.sender_type === 'bot' || msg.sender_type === 'ai') && selectedConversation?.conversation_type === 'ai';
                  const isThinking = msg.id.startsWith('thinking-');
                  
                  return (
                    <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] ${
                        isClient 
                          ? 'bg-primary-600 text-white' 
                          : isAI 
                            ? 'bg-purple-50 text-gray-900 border border-purple-200'
                            : 'bg-white text-gray-900'
                      } rounded-lg px-3 py-2 shadow-sm`}>
                        {isThinking ? (
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm text-purple-600">AI Agent is thinking...</span>
                          </div>
                        ) : isAI ? (
                          <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        
                        {/* Attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2">
                            <AttachmentPreview
                              attachments={msg.attachments}
                              showActions={true}
                              layout="list"
                            />
                          </div>
                        )}
                        
                        {/* AI Query Results - Show download button ONLY if more than 5 records */}
                        {msg.ai_data?.export_url && msg.ai_data.results?.total_rows && msg.ai_data.results.total_rows > 5 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded border border-purple-200">
                              <p className="font-medium">📥 Please click on the button below to view all {msg.ai_data.results?.total_rows?.toLocaleString()} records</p>
                            </div>
                            <a
                              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002'}${msg.ai_data.export_url}`}
                              download
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              📊 Download Excel ({msg.ai_data.results?.total_rows?.toLocaleString() || 'All'} records)
                            </a>
                          </div>
                        )}
                        
                        <p className={`text-xs mt-1 ${
                          isClient 
                            ? 'text-white/70' 
                            : 'text-gray-500'
                        }`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            {/* Pending Attachments Preview */}
            {pendingAttachments.length > 0 && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Attachments ({pendingAttachments.length})</p>
                  <button
                    onClick={() => setPendingAttachments([])}
                    className="text-xs text-red-600 hover:text-red-700"
                    type="button"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {pendingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {attachment.preview && (
                          <img
                            src={attachment.preview}
                            alt={attachment.file.name}
                            className="h-8 w-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {attachment.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(attachment.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemovePendingAttachment(attachment.id)}
                        className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                        type="button"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              {showAttachments && (
                <AttachmentButton
                  onFileSelect={handleFileSelect}
                  disabled={uploadingAttachments || sending}
                />
              )}
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={sending || uploadingAttachments}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <button
                type="submit"
                disabled={(!message.trim() && pendingAttachments.length === 0) || sending || uploadingAttachments}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm"
              >
                {uploadingAttachments ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}