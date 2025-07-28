import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Helper function to get token from either storage
const getTokenFromStorage = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const getRefreshTokenFromStorage = () => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
};

// Helper function to check if token is in localStorage (persistent)
const isTokenPersistent = () => {
  return localStorage.getItem('token') !== null;
};

const initialState = {
  user: null,
  token: getTokenFromStorage(),
  refreshToken: getRefreshTokenFromStorage(),
  isLoading: false,
  isAuthenticated: false,
  isPersistentLogin: isTokenPersistent(),
};

const authReducer = (state, action) => {
  console.log('AuthReducer: Action dispatched:', action.type, action.payload);
  switch (action.type) {
    case 'SET_LOADING':
      const loadingState = { ...state, isLoading: action.payload };
      console.log('AuthReducer: SET_LOADING new state:', loadingState);
      return loadingState;
    
    case 'LOGIN_SUCCESS':
      console.log('AuthReducer: Processing LOGIN_SUCCESS with rememberMe:', action.payload.rememberMe);
      const storage = action.payload.rememberMe ? localStorage : sessionStorage;
      console.log('AuthReducer: Selected storage:', storage === localStorage ? 'localStorage' : 'sessionStorage');
      
      // Clear tokens from both storages first to avoid conflicts
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      
      // Set tokens in the appropriate storage
      storage.setItem('token', action.payload.token);
      storage.setItem('refreshToken', action.payload.refreshToken);
      
      const newState = {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        isPersistentLogin: action.payload.rememberMe,
      };
      console.log('AuthReducer: LOGIN_SUCCESS new state:', newState);
      return newState;
    
    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        isPersistentLogin: false,
      };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        isPersistentLogin: isTokenPersistent(),
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (state.token) {
        dispatch({ type: 'SET_LOADING', payload: true });
        try {
          const user = await authService.getCurrentUser();
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    checkAuth();
  }, [state.token]);

  // Check if session storage token should be cleared on page load
  useEffect(() => {
    const handleStorageCheck = () => {
      // If token exists only in sessionStorage and page was refreshed/reopened
      // we need to check if the browser session is still valid
      const sessionToken = sessionStorage.getItem('token');
      const localToken = localStorage.getItem('token');
      
      // If only session token exists (no localStorage token)
      if (sessionToken && !localToken) {
        // The session token will be automatically used by getTokenFromStorage
        // This is the correct behavior - session tokens should persist during the browser session
        return;
      }
    };

    handleStorageCheck();
  }, []);

  const login = async (credentials, rememberMe = false) => {
    console.log('AuthContext: Starting login process with credentials:', { email: credentials.email }, 'rememberMe:', rememberMe);
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.login(credentials);
      console.log('AuthContext: Login API response received:', response);
      console.log('AuthContext: User object from login response:', JSON.stringify(response.user, null, 2));
      console.log('AuthContext: User role from login response:', response.user?.role, 'Type:', typeof response.user?.role);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { ...response, rememberMe } });
      console.log('AuthContext: LOGIN_SUCCESS dispatched successfully');
      toast.success('Login successful!');
      return response;
    } catch (error) {
      console.error('AuthContext: Login failed with error:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authService.register(userData);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { ...response, rememberMe: false } });
      toast.success('Registration successful!');
      return response;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
