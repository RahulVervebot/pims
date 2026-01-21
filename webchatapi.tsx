/**
 * API service layer for Django backend communication
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    tenant_id: string;
    tenant_name: string;
    tenant_role: 'owner' | 'member';
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface CreateConversationRequest {
  tenant_id: string;
  customer_name: string;
  customer_email: string;
  initial_message: string;
  conversation_type?: 'ai' | 'support';
}

export interface CreateConversationResponse {
  id: string;
  tenant: string;
  status: string;
  created_at: string;
  conversation_type?: 'ai' | 'support';
  escalated_to_support?: boolean;
  had_ai_conversation?: boolean;
  had_agent_conversation?: boolean;
  chat_display_name?: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  content: string;
  message_type?: 'text' | 'image' | 'file';
}

export interface MessageResponse {
  id: string;
  conversation: string;
  sender: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  sender_type: 'client' | 'agent' | 'bot' | 'ai' | 'system';
  sender_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'ai_response' | 'system';
  metadata?: Record<string, any>;
  created_at: string;
  is_read: boolean;
  attachments?: Array<{
    id: string;
    file_name: string;
    file_type: 'image' | 'document' | 'pdf' | 'spreadsheet' | 'archive' | 'other';
    file_size: number;
    file_url: string;
    mime_type: string;
    uploaded_at: string;
  }>;
  ai_data?: {
    sql?: string;
    results?: {
      preview: Array<Record<string, any>>;
      columns: string[];
      total_rows: number;
      preview_rows: number;
      has_more: boolean;
      humanized_summary: string;
    };
    export_url?: string;
    error?: string;
  };
}

export interface ConversationHistoryResponse {
  count: number;
  results: MessageResponse[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  /**
   * Login for client users
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/widget/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const result = await response.json();
    console.log('Login response received:', {
      hasUser: !!result.user,
      hasTokens: !!result.tokens,
      accessTokenType: typeof result.tokens?.access,
      accessTokenPreview: result.tokens?.access?.substring(0, 50)
    });
    
    return result;
  }

  /**
   * Get authenticated headers with JWT token
   */
  private getAuthHeaders(token: string): HeadersInit {
    console.log('Creating auth headers with token type:', typeof token);
    console.log('Token value:', token?.substring(0, 50) + '...');
    console.log('Token is string:', typeof token === 'string');
    
    // Ensure token is a clean string
    const cleanToken = String(token).trim();
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cleanToken}`,
    };
  }

  /**
   * Get user's conversations (authenticated)
   */
  async getUserConversations(token: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/`, {
      method: 'GET',
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch conversations' }));
      throw new Error(error.detail || 'Failed to fetch conversations');
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Create a new conversation (authenticated - for client portal)
   */
  async createConversation(subject: string, initialMessage: string, token: string, conversationType?: 'support' | 'ai'): Promise<CreateConversationResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat/conversations/`, {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({
        subject: subject,
        initial_message: initialMessage,
        conversation_type: conversationType || 'support',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create conversation' }));
      throw new Error(error.detail || 'Failed to create conversation');
    }

    return response.json();
  }

  /**
   * Create anonymous conversation (for public widget)
   */
  async createAnonymousConversation(data: CreateConversationRequest): Promise<CreateConversationResponse> {
    // Transform tenant_id to tenant for backend compatibility
    const requestData = {
      tenant: data.tenant_id,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      initial_message: data.initial_message,
    };

    const response = await fetch(`${this.baseUrl}/api/chat/conversations/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to create conversation' }));
      throw new Error(error.detail || 'Failed to create conversation');
    }

    return response.json();
  }

  /**
   * Send a message in a conversation (authenticated)
   */
  async sendMessage(conversationId: string, content: string, token: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/messages/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to send message' }));
      throw new Error(error.detail || 'Failed to send message');
    }

    return response.json();
  }

  /**
   * Get conversation history (authenticated)
   */
  async getConversationHistory(conversationId: string, token: string): Promise<MessageResponse[]> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/messages/`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(token),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch messages' }));
      throw new Error(error.detail || 'Failed to fetch messages');
    }

    const data: ConversationHistoryResponse = await response.json();
    return data.results;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/mark-read/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message_ids: messageIds }),
      }
    );

    if (!response.ok) {
      console.error('Failed to mark messages as read');
    }
  }

  /**
   * Logout and close active conversations
   */
  async logout(token: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/logout/`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
      });

      if (!response.ok) {
        console.error('Logout request failed, but continuing with local logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if API call fails
    }
  }

  /**
   * Get tenant configuration
   */
  async getTenantConfig(tenantId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/tenants/${tenantId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch tenant config' }));
      throw new Error(error.detail || 'Failed to fetch tenant config');
    }

    return response.json();
  }

  /**
   * Send AI query (for AI conversations)
   */
  async sendAIQuery(conversationId: string, query: string, token: string): Promise<MessageResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/ai/chat/${conversationId}/query/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to process AI query' }));
      throw new Error(error.detail || 'Failed to process AI query');
    }

    return response.json();
  }

  /**
   * Switch agent type (support <-> ai)
   */
  async switchAgent(conversationId: string, agentType: 'support' | 'ai', token: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/ai/chat/${conversationId}/switch-agent/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ agent_type: agentType }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to switch agent' }));
      throw new Error(error.detail || 'Failed to switch agent');
    }

    return response.json();
  }

  /**
   * Upload attachment for a message
   */
  async uploadAttachment(formData: FormData, token: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/attachments/upload/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to upload attachment' }));
      throw new Error(error.detail || 'Failed to upload attachment');
    }

    return response.json();
  }

  /**
   * Close an AI conversation (client only)
   */
  async closeConversation(conversationId: string, token: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/close/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to close conversation' }));
      throw new Error(error.detail || 'Failed to close conversation');
    }

    return response.json();
  }

  /**
   * Submit rating for a conversation
   */
  async submitRating(conversationId: string, rating: number, comment: string, token: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/api/chat/conversations/${conversationId}/submit-rating/`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ rating, comment }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Failed to submit rating' }));
      throw new Error(error.detail || 'Failed to submit rating');
    }

    return response.json();
  }
}

export const apiService = new ApiService();