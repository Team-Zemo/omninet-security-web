import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Grid,
  Alert,
  Snackbar,
  IconButton,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Fab
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import ContactList from '../../components/Chat/ContactList';
import MessageArea from '../../components/Chat/MessageArea';
import MessageComposer from '../../components/Chat/MessageComposer';
import AddContactModal from '../../components/Chat/AddContactModal';
import toast from 'react-hot-toast';

function Chat() {
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user } = useAuthStore();
  const {
    connected,
    connecting,
    error,
    selectedContact,
    connect,
    disconnect,
    loadContacts,
    reset,
    setCurrentUserEmail,
    selectContact
  } = useChatStore();

  // Initialize chat when component mounts
  useEffect(() => {
    if (user?.email) {
      // Set current user email in chat store
      setCurrentUserEmail(user.email);
      
      const initializeChat = async () => {
        try {
          // Load contacts first
          await loadContacts();

          // Auto-select first contact if none selected
          const state = useChatStore.getState();
            if (!state.selectedContact && state.contacts.length > 0) {
              // Select first contact which triggers history load
              state.selectContact(state.contacts[0]);
            }

          // Then connect to WebSocket (after potential selection)
          await connect();
        } catch (error) {
          console.error('Failed to initialize chat:', error);
          setConnectionError('Failed to connect to chat service');
        }
      };

      initializeChat();
    }

    // Cleanup on unmount
    return () => {
      reset();
    };
  }, [user?.email, setCurrentUserEmail]);

  // Handle connection errors
  useEffect(() => {
    if (error) {
      setConnectionError(error);
    }
  }, [error]);

  const handleRetryConnection = async () => {
    setConnectionError(null);
    try {
      await connect();
    } catch (error) {
      console.error('Retry connection failed:', error);
    }
  };

  const handleAddContact = () => {
    setAddContactOpen(true);
  };

  const handleCloseAddContact = () => {
    setAddContactOpen(false);
  };

  const handleBackToContacts = () => {
    selectContact(null);
  };

  if (!user) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        backgroundColor: '#f8fafc',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
      }}
    >
      {/* Connection Status Bar */}
      {(connecting || connectionError) && (
        <Alert
          severity={connectionError ? 'error' : 'info'}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {connectionError && (
                <IconButton
                  size="small"
                  onClick={handleRetryConnection}
                  sx={{ color: 'inherit' }}
                >
                  <RefreshIcon />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => setConnectionError(null)}
                sx={{ color: 'inherit' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          }
          sx={{ 
            borderRadius: 0,
            '&.MuiAlert-standardError': {
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              '& .MuiAlert-icon': { color: '#dc2626' }
            },
            '&.MuiAlert-standardInfo': {
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              '& .MuiAlert-icon': { color: '#3b82f6' }
            }
          }}
        >
          {connectionError ? (
            `Chat connection failed: ${connectionError}`
          ) : (
            'Connecting to chat service...'
          )}
        </Alert>
      )}

      {/* Main Chat Interface */}
      <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Box 
          sx={{ 
            height: '100%', 
            display: 'flex',
            maxWidth: '1400px',
            mx: 'auto',
            backgroundColor: 'white',
            borderRadius: { md: '16px 16px 0 0' },
            boxShadow: { md: '0 -4px 20px rgba(0,0,0,0.1)' },
            overflow: 'hidden'
          }}
        >
          {/* Contacts Sidebar */}
          <Box
            sx={{
              width: { xs: '100%', md: '380px' },
              borderRight: { md: '1px solid #e5e7eb' },
              display: { xs: selectedContact ? 'none' : 'flex', md: 'flex' },
              flexDirection: 'column',
              minHeight: 0,
              backgroundColor: '#ffffff'
            }}
          >
            <ContactList onAddContact={handleAddContact} />
          </Box>

          {/* Chat Area */}
          <Box
            sx={{
              flex: 1,
              display: { xs: selectedContact ? 'flex' : 'none', md: 'flex' },
              flexDirection: 'column',
              minHeight: 0,
              backgroundColor: '#fafafa',
              position: 'relative'
            }}
          >
            {/* Back button for mobile */}
            {isMobile && selectedContact && (
              <IconButton
                onClick={handleBackToContacts}
                sx={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  zIndex: 1000,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <ArrowBackIcon sx={{ color: '#374151' }} />
              </IconButton>
            )}

            {/* Messages Area */}
            <Box sx={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <MessageArea
                contact={selectedContact}
                currentUserEmail={user.email}
              />
            </Box>

            {/* Message Composer */}
            {selectedContact && (
              <MessageComposer
                contact={selectedContact}
                disabled={!connected}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Add Contact Modal */}
      <AddContactModal
        open={addContactOpen}
        onClose={handleCloseAddContact}
      />

      {/* Connection Status Toast */}
      <Snackbar
        open={connected && !connectionError}
        message="Connected to chat service"
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </Box>
  );
}

export default Chat;