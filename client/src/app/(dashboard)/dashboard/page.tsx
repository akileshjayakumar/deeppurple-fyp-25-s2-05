"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { sessionApi, analysisApi } from "@/lib/api";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
}

export default function Dashboard() {
  const router = useRouter();
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      // Navigate to the new session
      router.push(`/sessions/${session.id}`);
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

    // Clear selected file
    setSelectedFile(null);

    // Create placeholder for assistant response
    const assistantMessageId = `assistant-${Date.now()}`;
    const placeholderMessage: Message = {
      id: assistantMessageId,
      content: currentFile ? "Analyzing your file..." : "",
      role: "assistant",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      if (currentFile && sessionId) {
        // Ensure sessionId is not null
        // Handle file upload with question
        const response = await analysisApi.askQuestionWithFile(
          sessionId,
          currentInput,
          currentFile
        );

        // Update the message with the response
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    response?.answer ||
                    "I've analyzed your file but couldn't generate a response.",
                }
              : msg
          )
        );
      } else if (sessionId) {
        // Ensure sessionId is not null
        // Use streaming API for plain questions
        await analysisApi.streamQuestion(sessionId, currentInput, (token) => {
          // Update message content with each new token
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        });
      } else {
        throw new Error("Session ID is required but not available");
      }
    } catch (error) {
      console.error("Error processing question:", error);
      // Show error in the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  "Sorry, I encountered an error while processing your request. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Clear the file input value to allow selecting the same file again
      e.target.value = "";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
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
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {currentSessionId ? "Current Conversation" : "New Conversation"}
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNewChat}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
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
