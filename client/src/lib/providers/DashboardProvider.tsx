"use client";
import React, {  useState, useRef, ReactNode } from "react";
import { DashboardContext, DashboardContextType, Message } from '@/lib/contexts/DashboardContext';
import { QuestionDataVisualization } from "@/types";



// Provider Component
export function DashboardProvider({ children }: { children: ReactNode }) {
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>("");
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Message state + Set initial message
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-message",
      content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
      role: "system",
      timestamp: new Date(),
    }
  ]);

  // Visualization state
  const [visualizationData, setVisualizationData] = useState<QuestionDataVisualization | null>(null);
  const [visualizationCacheKey, setVisualizationCacheKey] = useState<string | null>(null);

  // UI state
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVisualizaingRef = useRef<boolean>(false);
  const isFetchingVisDataRef = useRef<boolean>(false);

  // Helper functions
  const addMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }

  const removeMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }
  
  // Ensures data is not stale 
  const clearVisualizationCache = () => {
    setVisualizationData(null);
    setVisualizationCacheKey(null);
  }

  const resetToWelcomeMessage = () => {
    setMessages([
      {
        id: "welcome-message",
        content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
        role: "system",
        timestamp: new Date(),
      }
    ]);
    clearVisualizationCache();
  }

  const value: DashboardContextType = {
    // Session State
    currentSessionId,
    isCreatingSession,  
    setCurrentSessionId,
    setIsCreatingSession,

    // Message State
    messages,
    setMessages,
    addMessage,
    removeMessage,

    // Visualization state
    visualizationData,
    setVisualizationData,
    visualizationCacheKey,
    setVisualizationCacheKey,

    // UI State
    inputValue,
    setInputValue,
    isLoading, 
    setIsLoading,
    selectedFile,
    setSelectedFile,
    
    // Refs
    fileInputRef,
    messagesEndRef,
    isVisualizaingRef,
    isFetchingVisDataRef,

    // Actions
    resetToWelcomeMessage,
    clearVisualizationCache,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}