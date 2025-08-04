import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MergeConfirmationPage from './pages/MergeConfirmationPage';
import './App.css';

function App() {
  const { checkAuthStatus, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
            },
            error: {
              duration: 5000,
            },
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Merge Confirmation Route - Special case, needs auth check but not full protection */}
          <Route
            path="/merge-confirmation"
            element={<MergeConfirmationPage />}
          />

          {/* Home Route - Redirect based on auth status */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Catch all route - redirect to login */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
