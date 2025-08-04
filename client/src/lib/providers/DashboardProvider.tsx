"use client";
import React, {  useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { DashboardContext, DashboardContextType, Message } from '@/lib/contexts/DashboardContext';
import { QuestionDataVisualization } from "@/types";
import { sessionApi } from "@/lib/api";




// Provider Component
export function DashboardProvider({ children }: { children: ReactNode }) {
  // Session state + initialization -- Component will always operate with a defined sessionId
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [isSessionInitialized, setIsSessionInitialized] = useState<boolean>(false);
  const [isNewSession, setIsNewSession] = useState<boolean>(false);

  // Initialize the session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        console.log("Initializing Session...");

        // Get user sessions
        const response = await sessionApi.getSessions();
        const userSessions = response.sessions;

        let sessionId = null;
        if (userSessions.length > 0) {
          // Get most recent session
            sessionId = userSessions.reduce(
            (latest: typeof userSessions[0], current: typeof userSessions[0]) => {
                const latestTime = latest.created_at_timestamp || new Date(latest.created_at).getTime();
                const currentTime = current.created_at_timestamp || new Date(current.created_at).getTime();

                return currentTime > latestTime ? current : latest;
            }
            ).id;
            setIsNewSession(false)
            console.log("Using most recent session:", sessionId);
        } else {
            // Create new session
            // Does not update url.
            console.log(" Creating new session...");
            const session = await sessionApi.createSession("New Conversation");
            setIsNewSession(true);
            sessionId = session.id;
        }
        setCurrentSessionId(sessionId);
        setIsSessionInitialized(true);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setIsSessionInitialized(true);
      }
    };

    initializeSession();
  }, []);

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
  const isVisualizingRef = useRef<boolean>(false);
  const isFetchingVisDataRef = useRef<boolean>(false);

  // Helper functions
  const addMessage = (message: Message) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  }

  const removeMessage = (messageId: string) => {
    setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== messageId));
  }

  const updateMessage = (messageId: string, updates: Partial<Message>) => {
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
  }

  // Ensures data is not stale
  const clearVisualizationCache = useCallback(() => {
    setVisualizationData(null);
    setVisualizationCacheKey(null);
  }, [setVisualizationData, setVisualizationCacheKey]);

  const resetToWelcomeMessage = useCallback(() => {
    setMessages([
      {
        id: "welcome-message",
        content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
        role: "system",
        timestamp: new Date(),
      }
    ]);
    clearVisualizationCache();
  },[]);


  // Early returns
  // Session is initializing
    if (!isSessionInitialized){
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-gray-600">Initializing session...</p>
        </div>
      </div>
    );
  }
  // Session failed to initialize
  if (!currentSessionId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to initialize session. Please refresh the page.</p>
        </div>
      </div>
    );
  }


  // Create context
  const value: DashboardContextType = {
    // Session State
    currentSessionId,
    setCurrentSessionId,
    isSessionInitialized,
    setIsSessionInitialized,
    isNewSession,
    setIsNewSession,

    // Message State
    messages,
    setMessages,
    addMessage,
    removeMessage,
    updateMessage,

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
    // fileInputRef,
    // messagesEndRef,
    isVisualizingRef,
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
