import { create } from 'zustand';
import { chatAPI } from '../services/api';
import { tokenManager } from '../utils/tokenManager';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import {API_BASE_URL} from '../services/api';

export const useChatStore = create((set, get) => ({
  // Connection state
  stompClient: null,
  connected: false,
  connecting: false,
  error: null,

  // User state
  currentUserEmail: null,

  // Contacts
  contacts: [],
  contactsLoading: false,
  selectedContact: null,

  // Messages
  messages: {},
  messagesLoading: false,
  currentPage: {},

  // UI state
  typingUsers: {},
  onlineUsers: new Set(),

  // WebSocket Management
  connect: async () => {
    const state = get();
    if (state.connected || state.connecting) return;

    try {
      set({ connecting: true, error: null });

      // Get auth token
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const socket = new SockJS(`${API_BASE_URL}/ws`);
      const client = new Client({
        webSocketFactory: () => socket,
        debug: () => {}, // Disable debug logging
        connectHeaders: {
          'Authorization': `Bearer ${token}`,
          'userEmail': get().getCurrentUserEmail()
        },
        onConnect: (frame) => {
          console.log('Connected to WebSocket:', frame);
          
          // Subscribe to user's message queue
          const userEmail = get().getCurrentUserEmail();
          if (userEmail) {
            // Subscribe to messages
            const messageHandlers = [
              `/queue/messages-${userEmail}`,
              `/user/queue/messages`
            ];
            messageHandlers.forEach(dest => {
              try {
                client.subscribe(dest, (message) => {
                  try {
                    const messageData = JSON.parse(message.body);
                    console.debug('[CHAT] Incoming message via', dest, messageData);
                    get().handleIncomingMessage(messageData);
                  } catch (e) {
                    console.warn('[CHAT] Failed to parse message body', e);
                  }
                });
              } catch (e) {
                console.warn('[CHAT] Failed subscribing to', dest, e);
              }
            });

            // Subscribe to read receipts
            const readHandlers = [
              `/queue/read-${userEmail}`,
              `/user/queue/read`
            ];
            readHandlers.forEach(dest => {
              try {
                client.subscribe(dest, (message) => {
                  try {
                    const readData = JSON.parse(message.body);
                    console.debug('[CHAT] Read receipt via', dest, readData);
                    get().handleReadReceipt(readData);
                  } catch (e) {
                    console.warn('[CHAT] Failed to parse read receipt', e);
                  }
                });
              } catch (e) {
                console.warn('[CHAT] Failed subscribing to', dest, e);
              }
            });

            // Subscribe to typing indicators
            const typingHandlers = [
              `/queue/typing-${userEmail}`,
              `/user/queue/typing`
            ];
            typingHandlers.forEach(dest => {
              try {
                client.subscribe(dest, (message) => {
                  try {
                    const typingData = JSON.parse(message.body);
                    console.debug('[CHAT] Typing indicator via', dest, typingData);
                    get().handleTypingIndicator(typingData);
                  } catch (e) {
                    console.warn('[CHAT] Failed to parse typing payload', e);
                  }
                });
              } catch (e) {
                console.warn('[CHAT] Failed subscribing to', dest, e);
              }
            });
          }

          set({ 
            stompClient: client, 
            connected: true, 
            connecting: false,
            error: null
          });
        },
        onStompError: (frame) => {
          console.error('STOMP error:', frame);
          set({ 
            connecting: false, 
            connected: false,
            error: 'Failed to connect to chat server'
          });
        },
        onWebSocketError: (error) => {
          console.error('WebSocket error:', error);
          set({ 
            connecting: false, 
            connected: false,
            error: 'WebSocket connection failed'
          });
        }
      });

      client.activate();

    } catch (error) {
      console.error('Chat connection error:', error);
      set({ 
        connecting: false, 
        connected: false,
        error: error.message || 'Connection failed'
      });
    }
  },

  disconnect: () => {
    const state = get();
    if (state.stompClient && state.connected) {
      state.stompClient.deactivate();
      console.log('Disconnected from WebSocket');
    }
    set({ 
      stompClient: null, 
      connected: false, 
      connecting: false,
      error: null
    });
  },

  // Message Handling
  sendMessage: async (receiverEmail, content) => {
    const state = get();
    if (!state.connected || !state.stompClient) {
      throw new Error('Not connected to chat server');
    }

    const messageData = {
      receiverEmail,
      content
    };

    state.stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(messageData)
    });
    console.debug('[CHAT] Sent message payload', messageData);

    // Add optimistic message to local state
    const tempMessage = {
      id: `temp-${Date.now()}`,
      senderEmail: get().getCurrentUserEmail(),
      receiverEmail,
      content,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    get().addMessage(tempMessage);
  },

  handleIncomingMessage: (message) => {
    console.debug('[CHAT] handleIncomingMessage', message);
    get().addMessage(message);
    
    // Update contact's last message
    const contacts = get().contacts.map(contact => {
      if (contact.email === message.senderEmail) {
        return {
          ...contact,
          lastMessagePreview: message.content,
          lastMessageTime: message.timestamp,
          unreadCount: (contact.unreadCount || 0) + 1
        };
      }
      return contact;
    });
    
    set({ contacts });
  },

  addMessage: (message) => {
    const state = get();
    const conversationKey = get().getConversationKey(message.senderEmail, message.receiverEmail);
    const currentMessages = state.messages[conversationKey] || [];
    
    // Avoid duplicates by ID. This is the most reliable way.
    const exists = currentMessages.some(m => m.id === message.id);
    if (exists) {
      return;
    }

    // If the incoming message has a real ID, remove any temp message that matches.
    let newMessages = [...currentMessages];
    if (message.id && !message.id.startsWith('temp-')) {
      newMessages = newMessages.filter(m => {
        const isTempMatch = m.id.startsWith('temp-') &&
                            m.content === message.content &&
                            m.receiverEmail === message.receiverEmail;
        return !isTempMatch;
      });
    }
    
    newMessages.push(message);
    
    newMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    set({
      messages: {
        ...state.messages,
        [conversationKey]: newMessages
      }
    });
  },

  markAsRead: async (otherEmail) => {
    const state = get();
    if (!state.connected || !state.stompClient) {
      return;
    }

    const myEmail = get().getCurrentUserEmail();
    const readData = {
      myEmail,
      otherEmail
    };

    // Send via WebSocket
    state.stompClient.publish({
      destination: '/app/chat.read',
      body: JSON.stringify(readData)
    });

    // Also call REST API
    try {
      await chatAPI.markMessagesAsRead(readData);
    } catch (error) {
      console.error('Failed to mark messages as read via REST:', error);
    }

    // Update local state
    const conversationKey = get().getConversationKey(myEmail, otherEmail);
    const messages = state.messages[conversationKey] || [];
    const updatedMessages = messages.map(msg => {
      if (msg.senderEmail === otherEmail && msg.status !== 'READ') {
        return { ...msg, status: 'READ' };
      }
      return msg;
    });

    set({
      messages: {
        ...state.messages,
        [conversationKey]: updatedMessages
      }
    });

    // Update contact unread count
    const contacts = state.contacts.map(contact => {
      if (contact.email === otherEmail) {
        return { ...contact, unreadCount: 0 };
      }
      return contact;
    });

    set({ contacts });
  },

  handleReadReceipt: (readData) => {
    const state = get();
    // Some backends may send {myEmail, otherEmail} or {meEmail, otherEmail}; normalize
    const myEmail = readData.myEmail || readData.meEmail;
    const otherEmail = readData.otherEmail;
    if (!myEmail || !otherEmail) {
      console.warn('[CHAT] Read receipt missing emails', readData);
      return;
    }
    const conversationKey = get().getConversationKey(myEmail, otherEmail);
    const messages = state.messages[conversationKey] || [];
    
    const updatedMessages = messages.map(msg => {
      if (msg.receiverEmail === myEmail && msg.status !== 'READ') {
        return { ...msg, status: 'READ' };
      }
      return msg;
    });

    set({
      messages: {
        ...state.messages,
        [conversationKey]: updatedMessages
      }
    });

    console.debug('[CHAT] Applied read receipt', { myEmail, otherEmail, updated: updatedMessages.length });
  },

  // Typing Indicators
  sendTyping: (toEmail, typing) => {
    const state = get();
    if (!state.connected || !state.stompClient) {
      return;
    }

    const typingData = {
      toEmail,
      typing
    };

    state.stompClient.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(typingData)
    });
  },

  handleTypingIndicator: (typingData) => {
    console.debug('[CHAT] handleTypingIndicator', typingData);
    const state = get();
    const typingUsers = { ...state.typingUsers };
    
    if (typingData.typing) {
      typingUsers[typingData.fromEmail] = Date.now();
    } else {
      delete typingUsers[typingData.fromEmail];
    }

    set({ typingUsers });

    // Auto-remove typing indicator after 3 seconds
    if (typingData.typing) {
      setTimeout(() => {
        const currentState = get();
        const currentTyping = { ...currentState.typingUsers };
        if (currentTyping[typingData.fromEmail] === typingUsers[typingData.fromEmail]) {
          delete currentTyping[typingData.fromEmail];
          set({ typingUsers: currentTyping });
        }
      }, 3000);
    }
  },

  // Contact Management
  loadContacts: async () => {
    try {
      set({ contactsLoading: true });
      const contacts = await chatAPI.listContacts();
      set({ contacts, contactsLoading: false });
    } catch (error) {
      console.error('Failed to load contacts:', error);
      set({ contactsLoading: false });
    }
  },

  addContact: async (contactEmail) => {
    try {
      const myEmail = get().getCurrentUserEmail();
      await chatAPI.addContact({
        meEmail: myEmail,
        contactEmail
      });
      
      // Reload contacts
      await get().loadContacts();
    } catch (error) {
      console.error('Failed to add contact:', error);
      throw error;
    }
  },

  selectContact: (contact) => {
    set({ selectedContact: contact });
    
    // Always reload history for the selected contact to ensure it's fresh
    get().loadMessageHistory(contact.email);

    // Mark messages as read
    if (contact.unreadCount > 0) {
      get().markAsRead(contact.email);
    }
  },

  // Message History
  loadMessageHistory: async (otherEmail, page = 0) => {
    try {
      set({ messagesLoading: true });
      const response = await chatAPI.getMessageHistory(otherEmail, page);
      
      const conversationKey = get().getConversationKey(
        get().getCurrentUserEmail(),
        otherEmail
      );
      
      const existingMessages = get().messages[conversationKey] || [];
      const newMessages = response.items.slice().reverse();
      
      set({
        messages: {
          ...get().messages,
          [conversationKey]: newMessages
        },
        currentPage: {
          ...get().currentPage,
          [conversationKey]: page
        },
        messagesLoading: false
      });
      
    } catch (error) {
      console.error('Failed to load message history:', error);
      set({ messagesLoading: false });
    }
  },

  // Utility functions
  getCurrentUserEmail: () => {
    const state = get();
    if (state.currentUserEmail) {
      return state.currentUserEmail;
    }
    
    // Try to get from localStorage as fallback
    try {
      const authStore = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      return authStore?.state?.user?.email || null;
    } catch {
      return null;
    }
  },

  setCurrentUserEmail: (email) => {
    // This can be called from the main chat component to ensure we have the email
    set({ currentUserEmail: email });
  },

  getConversationKey: (email1, email2) => {
    return [email1, email2].sort().join('_');
  },

  getMessagesForContact: (contactEmail) => {
    const state = get();
    const conversationKey = get().getConversationKey(
      get().getCurrentUserEmail(),
      contactEmail
    );
    return state.messages[conversationKey] || [];
  },

  isTyping: (contactEmail) => {
    const state = get();
    return !!state.typingUsers[contactEmail];
  },

  // Cleanup
  reset: () => {
    get().disconnect();
    set({
      currentUserEmail: null,
      contacts: [],
      selectedContact: null,
      messages: {},
      typingUsers: {},
      onlineUsers: new Set(),
      currentPage: {},
      error: null
    });
  }
}));