"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api";
import { User, AuthResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  signup: (
    email: string,
    fullName: string,
    password: string,
    isAdmin: boolean,
    userTier: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  // Check if user is authenticated on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setIsLoading(false);
          if (!pathname?.includes("/login") && !pathname?.includes("/signup")) {
            router.push("/login");
          }
          return;
        }

        const userData = await authApi.getCurrentUser();
        setUser(userData);

        if (pathname === "/login" || pathname === "/signup") {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        localStorage.removeItem("token");
        if (!pathname?.includes("/login") && !pathname?.includes("/signup")) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Google login function
  const googleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      if (!credential) {
        throw new Error("No credential provided");
      }
      const authResponse: AuthResponse = await authApi.googleLogin(credential);
      console.log("Google login response:", authResponse);
      localStorage.setItem("token", authResponse.access_token);
      const userData = await authApi.getCurrentUser();
      setUser(userData);

      router.push("/dashboard");
    } catch (error) {
      console.error("Google login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authResponse: AuthResponse = await authApi.login(email, password);
      localStorage.setItem("token", authResponse.access_token);

      const userData = await authApi.getCurrentUser();
      setUser(userData);

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (
    email: string,
    fullName: string,
    password: string,
    isAdmin: boolean,
    userTier: string
  ) => {
    setIsLoading(true);
    try {
      await authApi.signup({
        email,
        fullName,
        password,
        isAdmin,
        userTier,
      });
      router.push("/login");
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear token and redirect even if API call fails
      localStorage.removeItem("token");
      setUser(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated, login, signup, logout, googleLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
