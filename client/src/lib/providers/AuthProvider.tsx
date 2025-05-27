"use client";

import { AuthProvider as AuthContextProvider } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContextProvider>{children}</AuthContextProvider>;
}
