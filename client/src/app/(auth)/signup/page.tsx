"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: "Full name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password must be at least 8 characters" }),
    role: z.enum(["user"], {
      required_error: "You need to select a role",
    }),
    tier: z
      .enum(["basic", "premium"], {
        required_error: "You need to select a tier",
      })
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.role === "user") {
        return data.tier !== undefined;
      }
      return true;
    },
    {
      message: "You need to select a tier as an End-User",
      path: ["tier"],
    }
  );

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "user",
    },
    mode: "onChange",
  });

  const watchRole = form.watch("role");

  async function onSubmit(data: SignupFormValues) {
    try {
      await signup(
        data.email,
        data.fullName,
        data.password,
        false, // isAdmin is always false now
        data.tier as string
      );
      toast.success("Account created successfully! Please login.", {
        duration: 3000,
        className: "animate-in fade-in-50 duration-300",
      });
    } catch (error: unknown) {
      console.error("Signup error:", error);
      
      // Simple error message with animation
      toast.error("Signup failed. Please check your information and try again.", {
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
    }
  }

  return (
    <div className="w-full max-w-md transition-all duration-300 ease-in-out">
      {/* Main heading */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Create an account</h1>
        <p className="text-gray-600 mt-2">Join DeepPurple to analyze communications</p>
      </div>

      {/* Signup form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-4"
            style={{ transition: "all 0.2s ease" }}
          >
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Full name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John Doe" 
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-gray-700">Confirm password</FormLabel>
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-xs text-primary hover:underline focus:outline-none"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-10 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-gray-700">Select your role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="user" />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="font-medium text-gray-800">
                              End-User
                            </FormLabel>
                            <FormDescription className="text-xs text-gray-500">
                              Regular user who can use sentiment analysis features
                            </FormDescription>
                          </div>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {watchRole === "user" && (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
                <FormField
                  control={form.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-gray-700">Select your subscription tier</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="basic" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-medium text-gray-800">
                                Basic
                              </FormLabel>
                              <FormDescription className="text-xs text-gray-500">
                                Default tier with essential features
                              </FormDescription>
                            </div>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="premium" />
                            </FormControl>
                            <div className="space-y-1">
                              <FormLabel className="font-medium text-gray-800">
                                Premium
                              </FormLabel>
                              <FormDescription className="text-xs text-gray-500">
                                Advanced tier with additional features
                              </FormDescription>
                            </div>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-10 font-medium transition-all duration-200 hover:shadow-md mt-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </Form>
      </div>

      {/* Login link */}
      <div className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
