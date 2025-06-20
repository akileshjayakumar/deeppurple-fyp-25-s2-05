"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { GoogleLogin } from "@react-oauth/google";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, googleLogin, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    try {
      await login(data.email, data.password);
      toast.success("Login successful!");
    } catch (error: unknown) {
      console.error("Login error:", error);
      
      // Simple error message with animation
      toast.error("Invalid credentials. Please check your email and password.", {
        duration: 3000,
        className: "animate-in fade-in-50 duration-300",
      });
      
      // Shake animation for form
      const formElement = document.querySelector("form");
      if (formElement) {
        formElement.classList.add("animate-shake");
        setTimeout(() => {
          formElement.classList.remove("animate-shake");
        }, 500);
      }
      
      // Focus on the email field for better UX
      form.setFocus("email");
    }
  }

  async function onGoogleSubmit(credentialResponse: any) {
    try {
      await googleLogin(credentialResponse.credential);
      toast.success("Google login successful!");
    } catch (error: unknown) {
      console.error("Google login error:", error);
      
      toast.error("Google login failed. Please try again or use email/password.", {
        duration: 3000,
        className: "animate-in fade-in-50 duration-300",
      });
    }
  }

  return (
    <div className="w-full max-w-md transition-all duration-300 ease-in-out">
      {/* Main heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-gray-600 mt-2">Sign in to your DeepPurple account</p>
      </div>

      {/* Login form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-4"
            style={{ transition: "all 0.2s ease" }}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Email address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="email@example.com" 
                      className="h-10 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-gray-700">Password</FormLabel>
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-primary hover:underline focus:outline-none"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-10 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-10 font-medium transition-all duration-200 hover:shadow-md"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-3 text-gray-500 text-sm">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Google Login */}
        <div className="flex w-full justify-center items-center">
          <div>
            <GoogleLogin
              onSuccess={onGoogleSubmit}
              onError={() => {
                toast.error("Google login failed. Please try again.", {
                  duration: 3000,
                  className: "animate-in fade-in-50 duration-300",
                });
              }}
              shape="rectangular"
              text="signin_with"
              size="large"
              theme="outline"
              logo_alignment="center"
              containerProps={{ style: { width: "auto" } }}
            />
          </div>
        </div>
      </div>

      {/* Sign up link */}
      <div className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          href="/signup"
          className="text-primary font-medium hover:underline transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
