import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('lumiere_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('lumiere_token') || null;
  });

  const loading = false;

  // Sync state to localStorage
  useEffect(() => {
    if (user && token) {
      localStorage.setItem('lumiere_user', JSON.stringify(user));
      localStorage.setItem('lumiere_token', token);
    } else {
      localStorage.removeItem('lumiere_user');
      localStorage.removeItem('lumiere_token');
    }
  }, [user, token]);

  // Register Function
  const register = async ({ name, email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.detail || 'Registration failed. Please check your details.',
        };
      }

      // If user & token returned, log them in automatically
      if (data.user && data.token) {
        setUser(data.user);
        setToken(data.token);
      }

      return {
        success: true,
        message: data.message || 'Account created successfully!',
        user: data.user,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your network or try again.',
      };
    }
  };

  // Login Function
  const login = async ({ email, password }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.detail || 'Invalid email or password.',
        };
      }

      setUser(data.user);
      setToken(data.token);

      return {
        success: true,
        message: data.message || 'Logged in successfully!',
        user: data.user,
      };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to the server. Please check your network or try again.',
      };
    }
  };

  // Logout Function
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/logout/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
        }).catch(() => {});
      }
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('lumiere_user');
      localStorage.removeItem('lumiere_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
