import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

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
    // Note: there used to be an auto-login mock user here for localhost.
    // The mock session_token was never accepted by the server, so every
    // API call under it failed anyway — a confusing "logged in but broken"
    // state. Removed; local dev now goes through the same OTP login flow
    // as production.
    const savedUser = localStorage.getItem("umamusica_user");
    if (savedUser) return JSON.parse(savedUser);
    return null;
  });
  const location = useLocation()

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
    if (!user || !user.email || !user.session_token) return

    const publicPaths = ["/login", "/", "/faq", "/termos", "/privacidade"]
    const isPublicPath = publicPaths.some((p) => {
      if (p === "/") return location.pathname === "/"
      if (p.includes(":")) {
        const base = p.split("/:")[0]
        return location.pathname.startsWith(base + "/")
      }
      return location.pathname === p || location.pathname.startsWith(p + "/")
    })
    if (isPublicPath) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(`${import.meta.env.VITE_API_URL || ""}/api/users/me?email=${encodeURIComponent(user.email!)}`, {
        headers: {
          "Authorization": `Bearer ${user.session_token}`
        },
        signal: controller.signal
      })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Invalid session")
          }
          if (!res.ok) {
            console.warn(`Auth sync non-critical error: ${res.status}`)
            return null
          }
          return res.json()
        })
        .then(data => {
          if (data?.user) {
            updateUser(data.user)
          }
        })
        .catch(err => {
          if (err.name === "AbortError") return
          if (err.message === "Invalid session") {
            console.warn("Auth guard: Invalid session, logging out.")
            logout()
          } else {
            console.warn("Auth guard non-critical network error:", err)
          }
        })
    }, 100) // 100ms debounce

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [location.pathname])

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
