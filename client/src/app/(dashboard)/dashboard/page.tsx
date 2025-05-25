"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  PlusCircle,
  Send,
  Upload,
  Bot,
  User,
  Loader2,
  X,
  FileText,
  FileDown,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { sessionApi, analysisApi, fileApi } from "@/lib/api";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
}

// This is the main dashboard component that will be wrapped with Suspense
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newSessionName, setNewSessionName] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Chat functionality
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-message",
      content:
        "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
      role: "system",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load session from URL query parameter
  useEffect(() => {
    const sessionId = searchParams.get('session');
    console.log('Session ID from URL:', sessionId);
    if (sessionId) {
      loadExistingSession(sessionId);
    } else {
      // Reset to default state when no session is selected
      setCurrentSessionId(null);
      setMessages([
        {
          id: "welcome-message",
          content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
          role: "system",
          timestamp: new Date(),
        },
      ]);
    }
  }, [searchParams]);
  
  // Function to load an existing session
  const loadExistingSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading session:', sessionId);
      
      // Fetch session details
      const session = await sessionApi.getSessionById(sessionId);
      console.log('Session details loaded:', session);
      setCurrentSessionId(sessionId);
      
      // Fetch session messages
      try {
        console.log('Fetching messages for session:', sessionId);
        const messageHistory = await sessionApi.getSessionMessages(sessionId);
        console.log('Message history loaded:', messageHistory);
        
        // Always include the welcome message
        const formattedMessages: Message[] = [
          {
            id: "welcome-message",
            content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
            role: "system",
            timestamp: new Date(),
          }
        ];
        
        // Add message history if available
        if (messageHistory && messageHistory.length > 0) {
          // Add all messages from history - each message contains both question and answer
          messageHistory.forEach((msg: any) => {
            // First add the user question
            if (msg.question_text) {
              formattedMessages.push({
                id: `question-${msg.id}`,
                content: msg.question_text,
                role: "user",
                timestamp: new Date(msg.created_at),
              });
            }
            
            // Then add the AI response if it exists
            if (msg.answer_text) {
              formattedMessages.push({
                id: `answer-${msg.id}`,
                content: msg.answer_text,
                role: "assistant",
                timestamp: new Date(msg.answered_at || msg.created_at),
              });
            }
          });
        }
        
        console.log('Formatted messages:', formattedMessages);
        setMessages(formattedMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load conversation history");
      }
      
      toast.success(`Loaded session: ${session.name}`);
    } catch (error) {
      console.error("Error loading session:", error);
      toast.error("Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSessionName.trim()) {
      toast.error("Session name cannot be empty");
      return;
    }

    setIsCreatingSession(true);

    try {
      const session = await sessionApi.createSession(newSessionName);
      toast.success("Session created successfully");
      setNewSessionName("");
      setIsDialogOpen(false);
      setCurrentSessionId(session.id);

      // Navigate to the dashboard with the new session ID
      router.push(`/dashboard?session=${session.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("Failed to create session");
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && !selectedFile) {
      toast.error("Please enter a question or upload a file");
      return;
    }

    // If only a file is selected with no question, prompt for a question
    if (selectedFile && !inputValue.trim()) {
      toast.info("Please enter a question about this file");
      return;
    }

    // Create a session if one doesn't exist
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const session = await sessionApi.createSession("New Conversation");
        sessionId = session.id;
        setCurrentSessionId(sessionId);
      } catch (error) {
        console.error("Error creating session:", error);
        toast.error("Failed to create a new session");
        return;
      }
    }

    // Add user message to chat
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: selectedFile
        ? `[File: ${selectedFile.name}] ${inputValue}`
        : inputValue,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Save current input and file for processing
    const currentInput = inputValue;
    const currentFile = selectedFile;
    setSelectedFile(null);
    
    // Create a placeholder message for streaming response
    const aiMessageId = `ai-${Date.now()}`;
    const placeholderMessage: Message = {
      id: aiMessageId,
      content: "", // Empty content that will be filled as tokens arrive
      role: "assistant",
      timestamp: new Date(),
    };
    
    // Add the placeholder message
    setMessages((prev) => [...prev, placeholderMessage]);
    
    try {
      // Handle file upload first if there's a file
      if (currentFile) {
        try {
          // Upload the file and stream the response
          toast.info("Uploading and analyzing file...");
          
          // Define handlers for streaming and upload progress
          let accumulatedResponse = "";
          
          const handleToken = (token: string) => {
            accumulatedResponse += token;
            
            // Update the message with the accumulated response
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: accumulatedResponse } 
                  : msg
              )
            );
          };
          
          const handleUploadProgress = (progress: number) => {
            // You could use this to show a progress indicator
            console.log(`Upload progress: ${progress}%`);
          };
          
          // Use the streaming version for file uploads
          await analysisApi.streamQuestionWithFile(
            sessionId as string,
            currentInput || "Please analyze this file",
            currentFile,
            handleToken,
            handleUploadProgress
          );
          
          toast.success("File analyzed successfully");
        } catch (uploadError) {
          console.error("Error uploading and analyzing file:", uploadError);
          toast.error("Failed to process file");
          
          // Update placeholder with error message
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: "Sorry, I couldn't process that file. Please try again." } 
                : msg
            )
          );
          
          setIsLoading(false);
          return;
        }
      } else {
        // For regular questions, use streaming API
        // Define a callback function to handle incoming tokens
        let accumulatedResponse = "";
        
        const handleToken = (token: string) => {
          accumulatedResponse += token;
          
          // Update the message with the accumulated response
          setMessages((prev) => 
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, content: accumulatedResponse } 
                : msg
            )
          );
        };
        
        // Use the streaming API
        await analysisApi.streamQuestion(
          sessionId as string,
          currentInput,
          handleToken
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get a response");

      // Add error message to chat
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content:
          "I'm sorry, I encountered an error processing your request. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    // Reset the chat state
    setMessages([
      {
        id: "welcome-message",
        content:
          "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
        role: "system",
        timestamp: new Date(),
      },
    ]);
    setInputValue("");
    setSelectedFile(null);
    setCurrentSessionId(null);
  };
  
  // Handle export functionality
  const handleExportReport = async (format: "markdown" | "pdf" | "csv") => {
    if (!currentSessionId) {
      toast.error("No active session to export");
      return;
    }

    try {
      // Set loading state if needed
      const response = await fetch(
        `/api/sessions/${currentSessionId}/export?format=${format}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      // Handle different formats
      if (format === "markdown" || format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-export-${format === "markdown" ? "md" : "csv"}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === "pdf") {
        // For PDF, we might need to handle differently
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      }

      toast.success(`Exported session as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export session");
    } finally {
      // Reset loading state if needed
      setIsExportDropdownOpen(false);
    }
  };

  // Console log for debugging during build
  console.log('Rendering dashboard content, sessionId:', currentSessionId);
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNewChat}
            title="New Chat"
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {currentSessionId ? "Current Conversation" : "New Conversation"}
          </h1>
        </div>
        
        <div className="flex gap-2">
          {/* Export Button */}
          {currentSessionId && (
            <div className="relative" ref={exportDropdownRef}>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              >
                <FileDown className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => handleExportReport("markdown")}
                    >
                      Export as Markdown
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => handleExportReport("pdf")}
                    >
                      Export as PDF
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      onClick={() => handleExportReport("csv")}
                    >
                      Export as CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                Save Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Conversation</DialogTitle>
                <DialogDescription>
                  Give your conversation a name to save it as a session.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSession}>
                <div className="py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Session Name</Label>
                    <Input
                      id="name"
                      placeholder="E.g., Customer Feedback Analysis"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreatingSession}>
                    {isCreatingSession ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Session"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg border p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role !== "user" && (
                <Avatar
                  className={
                    message.role === "assistant"
                      ? "bg-purple-600"
                      : "bg-gray-400"
                  }
                >
                  <AvatarFallback>
                    {message.role === "assistant" ? "AI" : "SYS"}
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={`mx-2 rounded-lg p-4 max-w-[80%] ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : message.role === "assistant"
                    ? "bg-white border"
                    : "bg-gray-100"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className="text-xs opacity-70 mt-2 text-right">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {message.role === "user" && (
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="bg-white p-4 rounded-lg border">
        {selectedFile && (
          <div className="flex items-center gap-2 p-2 mb-2 border rounded-md bg-gray-50">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm truncate flex-1">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedFile
                ? "Ask a question about this file..."
                : "Ask a question..."
            }
            className="min-h-[60px] flex-1 resize-none"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoading || (!inputValue.trim() && !selectedFile)}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".txt,.csv,.pdf,.docx"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a wrapper component with Suspense boundary
export default function Dashboard() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
