"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Send,
  Upload,
  Loader2,
  X,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExportOptions } from "@/components/session/ExportOptions";


// types
import { QuestionDataVisualization } from "@/types";
import { EmotionDistributionChart } from "@/components/session/EmotionDistributionChart";
import { KeyTopicsBarChart } from "@/components/session/KeyTopicsBarChart";

import { Message } from "@/lib/contexts/DashboardContext";
import { DashboardProvider } from "@/lib/providers/DashboardProvider";
import { useDashboard } from "@/hooks/useDashboard";
import { useSession } from "@/hooks/useSession";
import { useMessage } from "@/hooks/useMessage";
import { useVisualization } from "@/hooks/useVisualization";





// This is the main dashboard component that will be wrapped with Suspense
function DashboardContent() {
  const searchParams = useSearchParams();

  // DOM related refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dashboard Context
  const {
    messages,
    currentSessionId,
    inputValue,
    setInputValue,
    selectedFile,
    setSelectedFile,
    isLoading,
    clearVisualizationCache,
    visualizationData,
    isFetchingVisDataRef,
  } = useDashboard();

  // Message Hook
  const  {
    handleSendMessage,
  } = useMessage();

  // Session Hook
  const {
    loadExistingSession,
  } = useSession();

  // Visualization hook
  const {
    handleVisualizeClick,
    handleChartTypeClick
  } = useVisualization();

  // Effects
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);


 // Only handle explicit session changes from URL
  const sessionId = searchParams.get("session")
  useEffect(() => {
    if (!currentSessionId) {
        console.log("No current session available yet");
        return;
    }
    if (sessionId && sessionId !== currentSessionId){
        console.log("Loading different session from URL:", sessionId);
        clearVisualizationCache()
        loadExistingSession(sessionId);
    } else if (!sessionId && currentSessionId) {
        console.log("Updating URL to current session: ", currentSessionId);
        window.history.replaceState({}, "", `/dashboard?session=${currentSessionId}`);
    }
  }, [sessionId, currentSessionId, loadExistingSession,clearVisualizationCache])


  // File Upload and Input Handling
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
                <div className = "flex justify-between items-center text-xs opacity-70 mt-2">

                  {/* Left side - Visualize Button or Chart Type Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Visualize Button */}
                    {(message.showVisualizeButton === true || message.showVisualizeButton === "hiding") && (
                      <Button
                        variant="outline"
                        className={`rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 transition-all duration-150 ${
                          message.showVisualizeButton === "hiding" ? "opacity-0 scale-95" : "opacity-100 scale-100"
                        }`}
                        size="sm"
                        onClick={() => handleVisualizeClick(currentSessionId)}
                        disabled={message.showVisualizeButton === "hiding"}
                      >
                        Visualize File?
                      </Button>
                    )}

                    {/* Chart Type Buttons */}
                    {message.showChartTypeButtons && (
                      <>
                        <Button
                          variant="outline"
                          className={`rounded-full border-0 transition-all duration-300 ${
                            visualizationData
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          size="sm"
                          onClick={() => handleChartTypeClick(currentSessionId, "emotion_distribution")}
                          disabled={!visualizationData || isFetchingVisDataRef.current}
                          >
                            Emotion Distribution
                          </Button>
                        <Button
                          variant="outline"
                          className={`rounded-full border-0 transition-all duration-300 ${
                            visualizationData
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                          size="sm"
                          onClick={() => handleChartTypeClick(currentSessionId, "key_topics")}
                          disabled={!visualizationData || isFetchingVisDataRef.current}
                          >
                            Key Topics
                          </Button>
                      </>
                    )}
                  </div>

                  {/* Right side - Timestamp */}
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
        <DashboardProvider>
            <DashboardContent />
        </DashboardProvider>
    </Suspense>
  );
}
