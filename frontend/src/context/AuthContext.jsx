import { createContext, useContext, useEffect, useState } from 'react';
import { tokenStore } from '../api/client.js';
import { authApi } from '../api/endpoints.js';

// Who is logged in, for the whole site (handbook 9.7).
// Usage: const { user, loading, login, register, logout } = useAuth();
// login(email, password) and register(form) throw the API error (message, status, details),
// so a form can catch it and show it. Without an AuthProvider everyone is simply a guest.
const AuthContext = createContext({
  user: null,
  loading: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only a saved token needs checking; without one we already know this is a guest.
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) return;

    // The user can log in or out while this runs; then the answer is about an old token.
    const stillCurrent = () => tokenStore.get() === token;

    authApi
      .me()
      .then(({ user: savedUser }) => {
        if (stillCurrent()) setUser(savedUser);
      })
      .catch((err) => {
        // Forget the token only when the server refuses it, not when the server is down.
        if (stillCurrent() && (err.status === 401 || err.status === 404)) tokenStore.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  function startSession({ user: loggedInUser, token }) {
    tokenStore.set(token);
    setUser(loggedInUser);
  }

  const value = {
    user,
    loading,
    login: async (email, password) => startSession(await authApi.login({ email, password })),
    register: async (form) => startSession(await authApi.register(form)),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
