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
  Download,
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
import { ExportOptions } from "@/components/session/ExportOptions";
import { set } from "zod";


// types
import { QuestionDataVisualization } from "@/types";
import { EmotionDistributionChart } from "@/components/session/EmotionDistributionChart";
import { KeyTopicsBarChart } from "@/components/session/KeyTopicsBarChart";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  chartData?: any;
  chartType?: string;
  showVisualizeButton?: boolean | "hiding";
  showChartTypeButtons?: boolean;
}

// This is the main dashboard component that will be wrapped with Suspense
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCreatingSession, setIsCreatingSession] = useState(false);

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
  const [visualizationData, setVisualizationData] = useState<QuestionDataVisualization | null>(null);
  const [visualizationCacheKey, setVisualizationCacheKey] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isVisualizingRef = useRef(false); // Track if currently visualizing
  const isFetchingVisDataRef = useRef(false); // Track if currently fetching visualization data

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Load session from URL parameter or find the most recent session
  useEffect(() => {
    const sessionId = searchParams.get('session');
    console.log('Session ID from URL:', sessionId);
    
    // Clear visualization cache when session changes
    setVisualizationData(null);
    setVisualizationCacheKey(null);
    
    if (sessionId) {
      // If a specific session ID is provided in the URL, load that session
      loadExistingSession(sessionId);
    } else {
      // When no session ID is provided, try to find the most recent session
      const findMostRecentSession = async () => {
        try {
          setIsLoading(true);
          // Get all sessions
          const response = await sessionApi.getSessions();
          const sessions = response.sessions || [];
          
          if (sessions.length > 0) {
            // Sort sessions by created_at date in descending order
            const sortedSessions = [...sessions].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            
            // Load the most recent session
            const mostRecentSession = sortedSessions[0];
            console.log('Loading most recent session:', mostRecentSession.id);
            loadExistingSession(mostRecentSession.id);
            
            // Update URL to include session ID without full page refresh
            window.history.pushState({}, '', `/dashboard?session=${mostRecentSession.id}`);
          } else {
            // Only create a new session if no sessions exist at all
            console.log('No existing sessions found, creating new one');
            setIsCreatingSession(true);
            const session = await sessionApi.createSession("New Conversation");
            setCurrentSessionId(session.id);
            
            // Update URL to include session ID without full page refresh
            window.history.pushState({}, '', `/dashboard?session=${session.id}`);
            
            setMessages([
              {
                id: "welcome-message",
                content:
                  "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
                role: "system",
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error("Error finding or creating session:", error);
          toast.error("Failed to load session");
        } finally {
          setIsCreatingSession(false);
          setIsLoading(false);
        }
      };
      
      findMostRecentSession();
    }
  }, [searchParams]);
  
  // Function to load an existing session
  const loadExistingSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading session:', sessionId);
      
      // Clear visualization cache when loading a different session
      setVisualizationData(null);
      setVisualizationCacheKey(null);
      
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

        console.log('Formatting messages from history:', messageHistory);
        
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
                chartData: msg.chart_data || undefined,
                chartType: msg.chart_type || undefined,
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

    // Get the current session or create one if needed
    let sessionId = currentSessionId;
    let isFirstMessageInSession = false;
    let currentSessionData = null;
    
    if (!sessionId) {
      try {
        setIsCreatingSession(true);
        // Create a session with default name initially
        const session = await sessionApi.createSession("New Conversation");
        sessionId = session.id;
        setCurrentSessionId(sessionId);
        isFirstMessageInSession = true;
        
        // Update URL to include session ID without full page refresh
        window.history.pushState({}, '', `/dashboard?session=${sessionId}`);
        
        toast.success("Session created automatically");
      } catch (error) {
        console.error("Error creating session:", error);
        toast.error("Failed to create a new session");
        return;
      } finally {
        setIsCreatingSession(false);
      }
    } else {
      try {
        // Check if this is the first message in an existing session
        // by fetching the current session data
        currentSessionData = await sessionApi.getSessionById(sessionId);
        // If the session still has the default name, we'll update it with the first message
        isFirstMessageInSession = currentSessionData?.name === "New Conversation";
      } catch (error) {
        console.error("Error checking session:", error);
      }
    }
    
    // If this is the first message, update the session name
    if (isFirstMessageInSession) {
      try {
        // Create a descriptive session name based on the user's first message
        const sessionName = inputValue.length > 30 
          ? `${inputValue.substring(0, 30)}...` 
          : inputValue;
        
        // Update the session name
        // Add type assertion as sessionId is guaranteed to be a string at this point
        await sessionApi.updateSession(sessionId as string, { name: sessionName });
        console.log(`Updated session name to: ${sessionName}`);
      } catch (error) {
        console.error("Error updating session name:", error);
        // Non-critical error, so we continue processing the message
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
                  ? { ...msg, content: accumulatedResponse}
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

          // After the file is uploaded and processed, we clear the last visualization as well as cachekey
          setVisualizationData(null);
          setVisualizationCacheKey(null);
          

          // After successful upload and analysis, show the visualize button
          // First remove visualize button from all other messages, then add to current message
          // Avoid the situation where multiple messages have the visualize button -> Only the last file should be visualized
          setMessages((prev) =>
            prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, showVisualizeButton: true } // Show visualize button after processing
                : { ...msg, showVisualizeButton: undefined } // Remove button from all other messages
            )
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



// * Visualization Functions
  const hideVisualizeButton = () => {
    // First, trigger the fade-out animation
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex(
        (msg) => msg.role === "assistant" && msg.showVisualizeButton
      );
      if (idx === -1) return prev;
      const realIdx = prev.length - 1 - idx;
      return prev.map((msg, index) =>
        index === realIdx
          ? { ...msg, showVisualizeButton: "hiding" } // Set to "hiding" state for animation
          : msg
      );  
    });

    // After animation duration, actually hide the button and show chart type buttons
    setTimeout(() => {
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex(
          (msg) => msg.role === "assistant" && (msg.showVisualizeButton === "hiding" || msg.showVisualizeButton === true)
        );
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return prev.map((msg, index) =>
          index === realIdx
            ? { ...msg, showVisualizeButton: false, showChartTypeButtons: true }
            : msg
        );  
      });
    }, 150);
  }

  const handleVisualizeClick = async (sessionId: string) => {
    // Check if already processing to prevent spam
    if (isFetchingVisDataRef.current) {
      toast.error("Please wait for the visualization data to finish loading");
      return;
    }
    
    try {
      toast.info("Loading visualization data...");
      isFetchingVisDataRef.current = true; // Set flag to indicate fetching visualization data is in progress
      
      // First hide the visualize button with animation
      hideVisualizeButton();
      
      // Fetch the visualization data when the button is clicked
      await fetchVisualizationData(sessionId);
      
      toast.success("Visualization data loaded successfully!");
      
    } catch (error) {
      console.error("Error fetching visualization data:", error);
      toast.error("Failed to load visualization data");
      
      // If there's an error, we should show the visualize button again
      setMessages((prev) => {
        const idx = [...prev].reverse().findIndex(
          (msg) => msg.role === "assistant" && msg.showChartTypeButtons
        );
        if (idx === -1) return prev;
        const realIdx = prev.length - 1 - idx;
        return prev.map((msg, index) =>
          index === realIdx
            ? { ...msg, showVisualizeButton: true, showChartTypeButtons: false }
            : msg
        );  
      });
    } finally {
      isFetchingVisDataRef.current = false; // Reset flag when done
    }
  };

  const fetchVisualizationData = async (sessionId: string) => {
    try {
      const currentCacheKey = `session-${sessionId}`;
      let response: QuestionDataVisualization;

      if (visualizationData && visualizationCacheKey === currentCacheKey) {
        // Use cached data if it matches the current session
        response = visualizationData;
        console.log('Using cached visualization data for session:', sessionId);
      } else {
        // Fetch new data and cache it
        console.log('Fetching new visualization data for session:', sessionId);
        setIsLoading(true);
        response = await analysisApi.visualizeLastFile(sessionId);
        setVisualizationData(response);
        setVisualizationCacheKey(currentCacheKey);
      }

      // Check if the response contains valid data
      if (!response || !response.overview || !response.overview.emotion_distribution) {
        throw new Error("Invalid visualization data received");
      }

      return response;
    }
    catch (error) {
      console.error("Error fetching visualization data:", error);
      toast.error("Failed to fetch visualization data");
      throw error; // Re-throw to handle in the main function
    }
    finally
    {
      setIsLoading(false);
    }
  };

  const handleChartTypeClick = async (sessionId: string, chartType: string) => {

    if (isFetchingVisDataRef.current) {
      toast.error("Visualization data has not yet loaded, please wait..");
      return;
    }

    if (isVisualizingRef.current) {
      toast.error("Please wait for the current visualization to finish");
      return;
    }
    isVisualizingRef.current = true; // Set flag to indicate visualization is in progress


    try {
      // User sends message based on chart type
      const formattedChartType = chartType.replace(/_/g, " ");
      const userMessageContent = `Show me the ${formattedChartType} chart for the last file uploaded.`;
      const aiMessageContent = `Here is the ${formattedChartType} chart for the last file uploaded.`;

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: userMessageContent,
        role: "user",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add Loading message
      const loadingMessage: Message = {
        id: `loading-${Date.now()}`,
        content: "Loading chart data...",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, loadingMessage]);
      setIsLoading(true);

      // Use cached visualization data (should already be loaded from handleVisualizeClick)
      const response = visualizationData;
      if (!response || !response.overview || !response.overview.emotion_distribution || !response.overview.key_topics) {
        throw new Error("Visualization data not available. Please try clicking 'Visualize File?' again.");
      }

      // Update the loading message with the chart data
      let chartData;
      if (chartType === "emotion_distribution") {
        chartData = response.overview.emotion_distribution;
      } else if (chartType === "key_topics") {
        chartData = response.overview.key_topics;
      }
      else {
        throw new Error("Unsupported chart type");
      }

      console.log(`Chart data for ${chartType}:`, chartData);
      const chartMessage: Message = {
        id: `chart-${Date.now()}`,
        content: aiMessageContent,
        role: "assistant",
        chartData: chartData,
        chartType: chartType,
        showVisualizeButton: false, // Hide visualize button for this message
        showChartTypeButtons: false, // Hide chart type buttons for this message
        timestamp: new Date(),
      };

      // Replace the loading message with the chart message
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id ? chartMessage : msg
        )
      );

      // Save to backend
      await analysisApi.askVisualizeQuestion(
        sessionId,
        userMessageContent,
        aiMessageContent,
        JSON.stringify(chartData),
        chartType
      );


      toast.success(`Successfully visualized ${chartType}`);
    } catch (error) {
      console.error("Error handling chart type click:", error);
      toast.error("Failed to handle chart type click");
      return;
    }
    finally {
      isVisualizingRef.current = false; // Reset flag when done
      setIsLoading(false);
    }
  };

  //* File Upload and Input Handling
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


  //* Component Render
  // Console log for debugging during build
  console.log('Rendering dashboard content, sessionId:', currentSessionId);
  
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {currentSessionId ? "Current Conversation" : "New Conversation"}
          </h2>
          {currentSessionId && messages.some(msg => msg.role === "assistant" && msg.id !== "welcome-message") && (
            <ExportOptions sessionId={currentSessionId} />
          )}
        </div>
        {/* Save Session button removed to enable auto-save */}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-lg border p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            // This div wraps each message and aligns it based on the role
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Renders the AI profile pic */}
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
                className={`mx-2 rounded-lg p-4 ${
                  message.chartData 
                    ? "max-w-[95%] min-w-[600px]" // Much wider for charts with minimum width
                    : "max-w-[80%]" // Normal width for text
                } ${
                  message.role === "user"
                    ? "bg-purple-600 text-white"
                    : message.role === "assistant"
                    ? "bg-white border"
                    : "bg-gray-100"
                }`}
              >
                {/* Message content */}
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* Render chart if available */}
                {/* Emotion Distribution Radial Chart */}
                {message.chartData && (message.chartType === "emotion_distribution") && (
                  <div className="mt-4">
                    <EmotionDistributionChart data={message.chartData} />
                  </div>
                )}
                {/* Key Topics Bar Chart */}
                {message.chartData && (message.chartType === "key_topics") && (
                  <div className="mt-4">
                    <KeyTopicsBarChart data={message.chartData} />
                  </div>
                )}

                {/* Footer of chat bubble */}
              {message.role === "assistant" && message.showVisualizeButton !== undefined ? (
                <div className = "flex justify-between items-center text-xs opacity-70 mt-2 text-right">

                  {/* Visualize Button */}
                  {(message.showVisualizeButton === true || message.showVisualizeButton === "hiding") && (
                    <Button
                      variant="outline"
                      className={`rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 transition-all duration-150 ${
                        message.showVisualizeButton === "hiding" ? "opacity-0 scale-95" : "opacity-100 scale-100"
                      }`}
                      size="sm"
                      onClick={() => {
                        handleVisualizeClick(currentSessionId as string);
                      }}
                      disabled={message.showVisualizeButton === "hiding"}
                    >
                      Visualize File?
                    </Button>
                  )}

                  {/* Chart Type Buttons */}
                  {message.showChartTypeButtons && (
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 transition-all duration-300"
                        size="sm"
                        onClick={()=> {
                          handleChartTypeClick(currentSessionId as string, "emotion_distribution");
                        }}
                        >
                          Emotion Distribution
                        </Button>
                      <Button
                        variant="outline"
                        className="rounded-full bg-green-100 text-green-700 hover:bg-green-200 border-0 transition-all duration-300"
                        size="sm"
                        onClick={()=> {
                          handleChartTypeClick(currentSessionId as string, "key_topics");
                        }}
                        >
                          Key Topics
                        </Button>
                    </div>
                  )};

                  <span>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ) : (
                <div className="text-xs opacity-70 mt-2 text-right">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              </div>
              {/* Renders the User profile pic */}
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
