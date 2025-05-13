"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Info, Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConversationMessage } from "@/types";
import { toast } from "sonner";
import { analysisApi } from "@/lib/api";

interface ConversationPanelProps {
  sessionId: string;
}

export function ConversationPanel({ sessionId }: ConversationPanelProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "system-1",
      session_id: sessionId,
      role: "system",
      content:
        "Welcome to your analysis session. Ask me questions about the content in this session.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      session_id: sessionId,
      role: "user",
      content: selectedFile
        ? `[File: ${selectedFile.name}] ${inputValue}`
        : inputValue,
      created_at: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Save the current input for potential fallback analysis
    const currentInput = inputValue;
    const currentFile = selectedFile;

    // Clear selected file
    setSelectedFile(null);

    // Create a placeholder message for streaming response
    const assistantMessageId = `assistant-${Date.now()}`;
    const placeholderMessage: ConversationMessage = {
      id: assistantMessageId,
      session_id: sessionId,
      role: "assistant",
      content: currentFile ? "Analyzing your file..." : "", // Different placeholder for file analysis
      created_at: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, placeholderMessage]);
    setIsStreaming(true);

    try {
      const numericSessionId = parseInt(sessionId, 10);

      if (isNaN(numericSessionId)) {
        throw new Error("Invalid session ID");
      }

      // If we have a file, use the combined question with file endpoint
      let response:
        | { answer: string; sources?: string[]; conversation_history?: any[] }
        | undefined;
      if (currentFile) {
        console.log(`Sending question with file: ${currentFile.name}`);
        response = await analysisApi.askQuestionWithFile(
          sessionId,
          currentInput,
          currentFile
        );

        // Update the message with the full response
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: response?.answer || "No response received" }
              : msg
          )
        );
      } else {
        // Use streaming API for plain questions
        await analysisApi.streamQuestion(sessionId, currentInput, (token) => {
          // Update the assistant message with each new token
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        });
      }
    } catch (error) {
      console.error("Error streaming response:", error);
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
      setIsStreaming(false);
      scrollToBottom();
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

  return (
    <Card className="flex flex-col h-[500px]">
      <CardHeader>
        <CardTitle>Conversation</CardTitle>
        <CardDescription>
          Ask questions about the content in this session
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : message.role === "system"
                  ? "bg-muted text-muted-foreground text-sm"
                  : "bg-secondary"
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : message.role === "system" ? (
                  <Info className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span className="font-medium text-xs">
                  {message.role === "user"
                    ? "You"
                    : message.role === "system"
                    ? "System"
                    : "AI Assistant"}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex flex-col w-full space-y-2">
          {/* File attachment UI similar to ChatGPT */}
          {selectedFile && (
            <div className="flex items-center gap-2 p-2 border border-input rounded-md bg-muted/50">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm truncate flex-1">
                {selectedFile.name}
              </span>
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
          <div className="flex items-center w-full space-x-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedFile
                  ? "Ask a question about this file..."
                  : "Ask a question or upload a file..."
              }
              className="flex-1 min-h-10 resize-none"
              disabled={isLoading}
            />
            <div className="flex space-x-2">
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={isLoading || (!inputValue.trim() && !selectedFile)}
              >
                <Send className="h-4 w-4" />
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
                accept=".txt,.csv,.pdf"
              />
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
