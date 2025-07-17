import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DashboardProvider } from './context/DashboardContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import FilesPage from './pages/FilesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
// import ProtectedRoute from './components/ProtectedRoute.jsx'; // Using custom wrapper instead
import LoadingSpinner from './components/LoadingSpinner.jsx';

// Protected Route wrapper component
const ProtectedRouteWrapper = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route wrapper (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('🔍 [PublicRoute] isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  if (isLoading) {
    console.log('🔄 [PublicRoute] Loading, showing spinner');
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    console.log('🔄 [PublicRoute] User is authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🔄 [PublicRoute] User not authenticated, showing public content');
  return children;
};

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <LandingPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              } 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRouteWrapper>
                  <Dashboard />
                </ProtectedRouteWrapper>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRouteWrapper>
                  <AnalyticsPage />
                </ProtectedRouteWrapper>
              } 
            />
            <Route 
              path="/analytics/:id" 
              element={
                <ProtectedRouteWrapper>
                  <AnalyticsPage />
                </ProtectedRouteWrapper>
              } 
            />
            <Route 
              path="/files" 
              element={
                <ProtectedRouteWrapper>
                  <FilesPage />
                </ProtectedRouteWrapper>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRouteWrapper>
                  <ProfilePage />
                </ProtectedRouteWrapper>
              } 
            />
            
            {/* Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRouteWrapper adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRouteWrapper>
              } 
            />
            
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Toast notifications */}
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
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </div>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;
