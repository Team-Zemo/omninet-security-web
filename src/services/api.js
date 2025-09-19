import axios from 'axios';
import { tokenManager } from '../utils/tokenManager';

// export const API_BASE_URL = 'http://localhost:8080';
export const API_BASE_URL = 'https://dfb0a2d354c0.ngrok-free.app';

// Configure axios with base URL and content type
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent infinite refresh loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        // No refresh token available, redirect to login
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await refreshAccessToken(refreshToken);
        const { accessToken, expiresIn } = response.data;

        tokenManager.updateAccessToken(accessToken, expiresIn);
        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to refresh token
const refreshAccessToken = async (refreshToken) => {
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/refresh-token`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );
  return response.data;
};

export const authAPI = {
  // Get current authenticated user
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/user');
    return response.data;
  },

  // Email/Password Login with JWT
  loginWithEmail: async (data) => {
    const response = await api.post('/api/auth/login/email', data);
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken) => {
    const response = await api.post('/api/auth/refresh-token', {
      refreshToken
    });
    return response.data;
  },

  // Logout current session
  logout: async () => {
    const refreshToken = tokenManager.getRefreshToken();
    if (!refreshToken) {
      return { success: true, message: 'Already logged out', data: { message: 'No active session' } };
    }

    const response = await api.post('/api/auth/logout', {
      refreshToken
    });
    return response.data;
  },

  // Logout from all devices
  logoutAll: async () => {
    const response = await api.post('/api/auth/logout-all', {});
    return response.data;
  },

  // Merge accounts after conflict
  mergeAccounts: () => api.post('/api/auth/merge-accounts?confirm=true'),

  // Get dashboard statistics
  getDashboardStats: () => api.get('/api/dashboard/stats'),

  // Email Registration Flow
  // Step 1: Initiate email registration
  initiateEmailRegistration: (data) =>
    api.post('/api/auth/register/initiate', data),

  // Step 2: Verify OTP code
  verifyEmailOtp: (data) =>
    api.post('/api/auth/register/verify-otp', data),

  // Step 3: Complete registration
  completeEmailRegistration: (data) => {
    return api.post(
      `/api/auth/register/complete`,
      {
        email: data.email,
        name: data.name,
        password: data.password,
        verificationToken: data.verificationToken
      }
    );
  },

  // Resend OTP code
  resendOtp: (data) =>
    api.post('/api/auth/register/resend-otp', data),

  // Check if email exists
  checkEmail: (email) =>
    api.get(`/api/auth/register/check-email?email=${encodeURIComponent(email)}`),

  // Check available authentication methods for email
  checkAuthMethods: (email) =>
    api.get(`/api/auth/check-methods?email=${encodeURIComponent(email)}`),

  // Add password to existing OAuth account
  addPassword: (email, password) =>
    api.post(`/api/auth/add-password`,
      `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    ),
};

// Category API

export const categoryAPI = {
  // Create a new category
  createCategory: async (data) => {
    const response = await api.post('/api/v1/category/save', data);
    return response.data;
  },

  // Get all categories for the user
  getCategory: async () => {
    const response = await api.get('/api/v1/category/active-category');
    return response.data;
  },

  // Get a specific category by ID
  getCategoryById: async (id) => {
    const response = await api.get(`/api/v1/category/${id}`);
    return response.data;
  },

  // Delete a category by ID
  deleteCategory: async (id) => {
    const response = await api.delete(`/api/v1/category/${id}`);
    return response.data;
  },
  editCategory: async (data) => {
    const response = await api.post('/api/v1/category/save', data);
    return response.data;
  }
};

// Notes api

export const notesAPI = {
  getNotes: async (pageNo = 0, pageSize = 10) => {
    const response = await api.get(`/api/v1/notes/user-notes?pageNo=${pageNo}&pageSize=${pageSize}`);
    return response.data;
  },

  getRecycledNotes: async (pageNo = 0, pageSize = 10) => {
    const response = await api.get(`/api/v1/notes/recycle-bin`);
    return response.data;
  },

  deleteNote: async (id) => {
    const response = await api.get(`/api/v1/notes/delete/${id}`);
    return response.data;
  },

  deleteNotePermanently: async (id) => {
    const response = await api.delete(`/api/v1/notes/delete/${id}`);
    return response.data;
  },

  emptyRecycleBin: async () => {
    const response = await api.delete('/api/v1/notes/delete-recycle');
    return response.data;
  },

  searchNotes: async(keyword, pageNo = 0, pageSize = 10) => {
    const response = await api.get(`/api/v1/notes/search?keyword=${encodeURIComponent(keyword)}&pageNo=${pageNo}&pageSize=${pageSize}`);
    return response.data;
  },

  downloadNote: async (id) => {
    const response = await api.get(`/api/v1/notes/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  copyNote: async (id) => {
    const response = await api.get(`/api/v1/notes/copy/${id}`);
    return response.data;
  },

  createNote: async (data) => {
    const formData = new FormData();
    const notesData = {
      title: data.title,
      description: data.description,
      category: {
        id: data.category.id,
        name: data.category.name
      }
    };
    
    formData.append('notes', JSON.stringify(notesData));
    
    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await api.post('/api/v1/notes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  updateNote: async (data) => {
    const formData = new FormData();
    const notesData = {
      id: data.id,
      title: data.title,
      description: data.description,
      category: {
        id: data.category.id,
        name: data.category.name
      }
    };
    
    formData.append('notes', JSON.stringify(notesData));
    
    if (data.file!== undefined) {
      console.log("File present " , data.file);
      formData.append('file', data.file);
    }

    const response = await api.post('/api/v1/notes/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

// Todo API

export const todoAPI = {
  getTodos: async () => {
    const response = await api.get('/api/v1/todo/');
    return response.data;
  },

  createTodo: async (data) => {
    const response = await api.post('/api/v1/todo/', data);
    return response.data;
  },

  updateTodo: async (data) => {
    const response = await api.post(`/api/v1/todo/`, data);
    return response.data;
  },

  deleteTodo: async (id) => {
    const response = await api.delete(`/api/v1/todo/${id}`);
    return response.data;
  },
};

// Storage API

export const storageAPI = {
  // Api to get a PreSignedUrl to upload a file.
  getUploadUrl: async (fileName) => {
    try {
      const response = await api.post(`/api/storage/files/upload-url`, { fileName });
      console.log('Raw upload URL API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload URL API error:', error);
      // Handle error response format
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  // Api to get a PreSignedUrl to download a file.
  getDownloadUrl: async (fileName) => {
    try {
      const response = await api.post(`/api/storage/files/download-url`, { fileName });
      console.log('Raw download URL API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Download URL API error:', error);
      // Handle error response format
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  //Api to create a folder. Should provide full path eg- "pop", "pop/opo"
  createFolder: async (folderName) => {
    const response = await api.post(`/api/storage/folders`, { folderName });
    return response.data;
  },

  //Api to get all files and folders in a specific folder
  getFilesAndFolders: async (folderName = '') => {
    try {
      // Handle empty folderName for root directory
      const url = folderName 
        ? `/api/storage/contents?folderName=${encodeURIComponent(folderName)}`
        : '/api/storage/contents';
      
      const response = await api.get(url);
      console.log('Storage API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Storage API error:', error);
      // If the endpoint doesn't exist, return empty structure
      if (error.response?.status === 404) {
        console.warn('Storage contents endpoint not found, returning empty structure');
        return { files: [], folders: [] };
      }
      throw error;
    }
  },

  //Api to check if a file exists.
  checkFileExists: async (fileName) => {
    if (!fileName) {
      return { exists: false };
    }
    const response = await api.get(`/api/storage/files/exists?fileName=${encodeURIComponent(fileName)}`);
    return response.data;
  },

  //Api to check if a folder exists.
  checkFolderExists: async (folderName) => {
    if (folderName === '' || folderName === null || folderName === undefined) {
      return { exists: true }; // Root folder always exists
    }
    const response = await api.get(`/api/storage/folders/exists?folderName=${encodeURIComponent(folderName)}`);
    return response.data;
  },

  //Api to delete a file
  deleteFile: async (fileName) => {
    try {
      const response = await api.delete("/api/storage/files", {
        data: { fileName },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Delete file API response:', response.data);
      return response.data;
    } catch(error) {
      console.error('Delete file error:', error);
      // Handle error response format
      if (error.response?.data) {
        return error.response.data;
      }
      throw error;
    }
  },

  //Api to delete a folder. Should provide full path eg- "pop", "pop/opo"
  deleteFolder: async (folderName) => {
    // Use request body instead of URL parameter for folder deletion
    const response = await api.delete(`/api/storage/folders`, { 
      data: { folderName },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
};

// Chat API

export const chatAPI = {
  // Contact Management
  addContact: async (data) => {
    const response = await api.post('/contacts/add', data);
    return response.data;
  },

  listContacts: async () => {
    const response = await api.get('/contacts/list');
    return response.data;
  },

  // Message Management
  getMessageHistory: async (otherEmail, page = 0, size = 20) => {
    const response = await api.get(`/messages/history?otherEmail=${encodeURIComponent(otherEmail)}&page=${page}&size=${size}`);
    return response.data;
  },

  markMessagesAsRead: async (data) => {
    const response = await api.post('/messages/mark-read', data);
    return response.data;
  },
};

// AI Chat API
export const aiChatAPI = {
 // Chat session management
 createChatSession: async (title) => {
   const response = await api.post("/api/chat/sessions", { title });
   return response.data;
 },

 getUserChatSessions: async () => {
   const response = await api.get("/api/chat/sessions");
   return response.data;
 },

 getChatSession: async (sessionId) => {
   const response = await api.get(`/api/chat/sessions/${sessionId}`);
   return response.data;
 },

 getSessionMessages: async (sessionId) => {
   const response = await api.get(`/api/chat/sessions/${sessionId}/messages`);
   return response.data;
 },

 deleteChatSession: async (sessionId) => {
   const response = await api.delete(`/api/chat/sessions/${sessionId}`);
   return response.data;
 },

 updateChatSession: async (sessionId, data) => {
   const response = await api.put(`/api/chat/sessions/${sessionId}`, data);
   return response.data;
 },

 // AI interactions
 sendMessage: async (prompt, sessionId) => {
   const formData = new FormData();
   formData.append("prompt", prompt);
   formData.append("sessionId", sessionId);

   const response = await api.post("/api/ai/chat", formData, {
     headers: {
       "Content-Type": "multipart/form-data",
     },
   });
   return response.data;
 },

 sendMessageWithSpeech: async (prompt, sessionId) => {
   const formData = new FormData();
   formData.append("prompt", prompt);
   formData.append("sessionId", sessionId);

   const response = await api.post("/api/ai/chat/speech", formData, {
     headers: {
       "Content-Type": "multipart/form-data",
     },
     responseType: "blob",
   });
   return response.data;
 },

 sendVoiceMessage: async (audioFile, sessionId) => {
   const formData = new FormData();
   formData.append("audio", audioFile);
   formData.append("sessionId", sessionId);

   const response = await api.post("/api/ai/chat/voice", formData, {
     headers: {
       "Content-Type": "multipart/form-data",
     },
     responseType: "blob",
   });
   return response.data;
 },
};

export default api;
