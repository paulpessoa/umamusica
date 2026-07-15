import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  referral_code?: string;
  free_songs_balance?: number;
  session_token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("umamusica_user");
    if (savedUser) return JSON.parse(savedUser);

    // Auto-login mock user for local testing on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      const path = window.location.pathname;
      if (path !== "/" && path !== "/login") {
        const mockUser = {
          id: "mock-dev-id",
          email: "dev@qisites.com.br",
          name: "Desenvolvedor Local",
          referral_code: "DEV123",
          free_songs_balance: 5,
          session_token: "mock-dev-session-token"
        };
        localStorage.setItem("umamusica_user", JSON.stringify(mockUser));
        return mockUser;
      }
    }
    return null;
  });

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("umamusica_user", JSON.stringify(userData));
  };

  const logout = async () => {
    if (user && user.session_token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || ""}/api/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${user.session_token}`
          }
        });
      } catch (err) {
        console.error("Erro ao chamar API de logout:", err);
      }
    }
    setUser(null);
    localStorage.removeItem("umamusica_user");
    window.location.href = "/";
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...userData, session_token: prev.session_token };
      localStorage.setItem("umamusica_user", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (user && user.email && user.session_token) {
      fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email)}`, {
        headers: {
          "Authorization": `Bearer ${user.session_token}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error("Invalid session")
          return res.json()
        })
        .then(data => {
          if (data.user) {
            updateUser(data.user)
          }
        })
        .catch(err => {
          console.error("Auth refresh failed:", err)
          setUser(null)
          localStorage.removeItem("umamusica_user")
        })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
