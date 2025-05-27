"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This is a temporary authentication check - will be replaced with actual JWT auth
const isAuthenticated = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token") !== null;
  }
  return false;
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if the user is authenticated
    if (isAuthenticated()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  // Return null since this page just redirects
  return null;
}
