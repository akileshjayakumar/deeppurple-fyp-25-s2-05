"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { sessionApi, fileApi, analysisApi } from "@/lib/api";
import { SessionWithInsights, FileInfo } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, SendIcon, Upload, X, FileText } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
}

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<SessionWithInsights | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "system-welcome",
      content:
        "Welcome! How can I help you with your sentiment analysis today?",
      role: "system",
      timestamp: new Date(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch session details and message history
  const fetchSessionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionData = await sessionApi.getSessionById(sessionId);
      setSession(sessionData);

      // Get previous chat history
      await fetchMessageHistory();

      // Get files
      try {
        const fileList = await fileApi.getFiles(sessionId);
        setFiles(fileList.files || fileList);
      } catch (fileErr) {
        console.error("Failed to load files:", fileErr);
        // Don't fail the whole page if just files fail to load
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
      setError("Failed to load session details");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Separate function to fetch message history
  const fetchMessageHistory = async () => {
    try {
      const messageHistory = await sessionApi.getSessionMessages(sessionId);
      if (messageHistory && messageHistory.length > 0) {
        // Initialize with the welcome message
        const formattedMessages: Message[] = [
          {
            id: "system-welcome",
            content:
              "Welcome! How can I help you with your sentiment analysis today?",
            role: "system",
            timestamp: new Date(),
          },
        ];

        // Process each message in the history
        messageHistory.forEach((msg: any) => {
          // Add user message (question)
          formattedMessages.push({
            id: `user-${msg.id}`,
            content: msg.question_text,
            role: "user",
            timestamp: new Date(msg.created_at),
          });

          // Add AI response if it exists
          if (msg.answer_text) {
            formattedMessages.push({
              id: `assistant-${msg.id}`,
              content: msg.answer_text,
              role: "assistant",
              timestamp: msg.answered_at
                ? new Date(msg.answered_at)
                : new Date(msg.created_at),
            });
          }
        });

        setMessages(formattedMessages);
        console.log(
          "Loaded message history:",
          formattedMessages.length,
          "messages"
        );
        return true;
      }
      return false;
    } catch (msgErr) {
      console.error("Failed to load message history:", msgErr);
      return false;
    }
  };

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleAskQuestion called with:", question);

    if (!question.trim() && !selectedFile) {
      toast.error("Please enter a question or select a file");
      return;
    }

    // If only a file is selected with no question, prompt for a question
    if (selectedFile && !question.trim()) {
      toast.info("Please enter a question about this file");
      return;
    }

    // Add user message to chat
    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      content: selectedFile
        ? `[File: ${selectedFile.name}] ${question}`
        : question,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsAskingQuestion(true);

    // Create a placeholder message for streaming
    const assistantId = (Date.now() + 1).toString();
    const placeholderMessage: Message = {
      id: assistantId,
      content: selectedFile ? "Analyzing your file..." : "", // Different placeholder for file analysis
      role: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    // Save current question and file for potential fallback
    const currentQuestion = question;
    const currentFile = selectedFile;

    // Clear input and selected file
    setQuestion("");
    setSelectedFile(null);

    try {
      if (currentFile) {
        // Use the combined endpoint for file+question
        const response = await analysisApi.askQuestionWithFile(
          sessionId,
          currentQuestion,
          currentFile
        );

        // Update the placeholder message with the response
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  content:
                    response.answer ||
                    "I've analyzed your file but couldn't answer your question.",
                }
              : msg
          )
        );

        // Refresh file list
        try {
          const fileList = await fileApi.getFiles(sessionId);
          setFiles(fileList.files || fileList);
        } catch (error) {
          console.error("Error refreshing file list:", error);
        }
      } else {
        console.log("Streaming question to server:", currentQuestion);
        // Use streaming API for plain questions
        await analysisApi.streamQuestion(
          sessionId,
          currentQuestion,
          (token) => {
            // Update message content with each new token
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          }
        );
        console.log("Streaming completed, message saved to database");
      }
    } catch (error) {
      console.error("Error processing question:", error);
      // Show error in the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  "Sorry, I encountered an error while processing your request. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Clear the file input value to allow selecting the same file again
      e.target.value = "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
        <p>The requested session could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{session.name}</h1>
        <p className="text-muted-foreground">
          Created on {new Date(session.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main chat area */}
        <div className="col-span-2">
          <Card className="h-[70vh] flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Conversation</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMessageHistory()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Ask questions and analyze text in this session
              </CardDescription>
            </CardHeader>

            {/* Messages area with scroll */}
            <CardContent className="flex-grow overflow-auto border-y">
              <div className="space-y-4 min-h-full">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role !== "user" && (
                      <Avatar
                        className={
                          message.role === "assistant"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        <AvatarFallback>
                          {message.role === "assistant" ? "AI" : "SYS"}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`rounded-lg p-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "assistant"
                          ? "bg-card border"
                          : "bg-muted text-muted-foreground text-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className="text-xs opacity-70 mt-1 text-right">
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
            </CardContent>

            {/* Input area */}
            <CardFooter className="p-4">
              <form
                onSubmit={handleAskQuestion}
                className="w-full flex flex-col gap-2"
              >
                {/* File attachment UI similar to ChatGPT */}
                {selectedFile && (
                  <div className="flex items-center gap-2 p-2 border border-input rounded-md bg-muted/50">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">
                      {selectedFile.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center w-full gap-2">
                  <Input
                    placeholder={
                      selectedFile
                        ? "Ask a question about this file..."
                        : "Ask a question or enter text to analyze..."
                    }
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    disabled={isAskingQuestion}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      isAskingQuestion || (!question.trim() && !selectedFile)
                    }
                  >
                    {isAskingQuestion ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <SendIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAskingQuestion}
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
              </form>
            </CardFooter>
          </Card>
        </div>

        {/* Right side: Only insights, removed file list */}
        <div className="space-y-6">
          {/* Insights summary card */}
          {session.insights && (
            <Card>
              <CardHeader>
                <CardTitle>Session Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {session.insights.emotion_summary && (
                  <div>
                    <h4 className="text-sm font-medium">Dominant Emotion:</h4>
                    <p className="text-primary font-bold capitalize">
                      {session.insights.emotion_summary.dominant_emotion}
                    </p>
                  </div>
                )}

                {session.insights.sentiment_summary && (
                  <div>
                    <h4 className="text-sm font-medium">Overall Sentiment:</h4>
                    <p className="capitalize font-bold">
                      {session.insights.sentiment_summary.overall}
                    </p>
                  </div>
                )}

                {session.insights.topics &&
                  session.insights.topics.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium">Top Topics:</h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {session.insights.topics.map((topic) => (
                          <span
                            key={topic.id}
                            className="bg-secondary text-xs px-2 py-1 rounded-full"
                          >
                            {topic.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
