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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  SendIcon,
  Upload,
  X,
  FileText,
  ChevronDown,
  FileDown,
  Paperclip,
  BarChart,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmotionDistributionChart } from "@/components/session/EmotionDistributionChart";
import { KeyTopicsBarChart } from "@/components/session/KeyTopicsBarChart";
import {Message} from "@/lib/contexts/DashboardContext";



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
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "insights">(
    "chat"
  );

  // Function to check if there's at least one AI response
  const hasAIResponses = useCallback(() => {
    return messages.some((message) => message.role === "assistant");
  }, [messages]);

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
              chartData: msg.chart_data,
              chartType: msg.chart_type,
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

  const handleDownload = async (fileId: string, filename: string) => {
    try
        {
        const response = await fileApi.downloadFile(fileId);
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success(`File ${filename} downloaded successfully!`);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Failed to download file. Please try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session.name}</h1>
          <p className="text-muted-foreground">
            Created on {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Tabs
        defaultValue="chat"
        className="w-full"
        onValueChange={(value) =>
          setActiveTab(value as "chat" | "files" | "insights")
        }
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger
            value="chat"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
          >
            Files ({files.length})
          </TabsTrigger>
          {/* <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800"
          >
            Insights
          </TabsTrigger> */}
        </TabsList>

        {/* chat_tab */}
        <TabsContent value="chat" className="mt-0">
          <div className="grid grid-cols-1 gap-6">
            <Card className="h-[70vh] flex flex-col border shadow-sm">
              <CardHeader className="bg-white border-b">
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
              <CardContent className="flex-grow overflow-auto border-y p-4">
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
              </CardContent>

              {/* Input area */}
              <CardFooter className="p-4 border-t bg-white">
                <form onSubmit={handleAskQuestion} className="w-full">
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 mb-2 border rounded-md bg-gray-50">
                      <FileText className="h-4 w-4 text-gray-500" />
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

                  <div className="flex gap-2">
                    <Textarea
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={
                        selectedFile
                          ? "Ask a question about this file..."
                          : "Ask a question..."
                      }
                      className="min-h-[60px] flex-1 resize-none"
                      disabled={isAskingQuestion}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        type="submit"
                        size="icon"
                        disabled={
                          isAskingQuestion ||
                          (!question.trim() && !selectedFile)
                        }
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isAskingQuestion ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SendIcon className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
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
                        accept=".txt,.csv,.pdf,.docx"
                      />
                    </div>
                  </div>
                </form>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
{/* Files tab */}
        <TabsContent value="files" className="mt-0">
          <Card className="border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle>Files</CardTitle>
              <CardDescription>Files uploaded in this session</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Paperclip className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No files uploaded yet</p>
                  <p className="text-sm">
                    Upload files by attaching them to your questions
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{file.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded{" "}
                            {new Date(file.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Button
                      variant="ghost"
                      size="sm"
                      onClick = {() => handleDownload(file.id,file.filename)}
                      >
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

 {/*
        <TabsContent value="insights" className="mt-0">
          <Card className="border shadow-sm">
            <CardHeader className="bg-white border-b">
              <CardTitle>Insights</CardTitle>
              <CardDescription>
                Analysis insights from this session
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {!session.insights ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart className="mx-auto h-12 w-12 mb-2 opacity-20" />
                  <p>No insights available yet</p>
                  <p className="text-sm">Ask questions to generate insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  Sentiment Summary
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Sentiment Analysis
                    </h3>
                    {session.insights.sentiment_summary ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">
                            Overall
                          </div>
                          <div className="flex items-center">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                session.insights.sentiment_summary.overall ===
                                "positive"
                                  ? "bg-green-100 text-green-800"
                                  : session.insights.sentiment_summary
                                      .overall === "negative"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {session.insights.sentiment_summary.overall ||
                                "Neutral"}
                            </span>
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">
                            Positive Score
                          </div>
                          <div className="font-medium">
                            {session.insights.sentiment_summary.positive?.toFixed(
                              2
                            ) || "N/A"}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <div className="text-sm text-muted-foreground mb-1">
                            Negative Score
                          </div>
                          <div className="font-medium">
                            {session.insights.sentiment_summary.negative?.toFixed(
                              2
                            ) || "N/A"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No sentiment data available
                      </p>
                    )}
                  </div>

                  // Emotion Summary
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Emotion Analysis
                    </h3>
                    {session.insights.emotion_summary ? (
                      <div>
                        <div className="bg-white p-4 rounded-lg border mb-4">
                          <div className="text-sm text-muted-foreground mb-1">
                            Dominant Emotion
                          </div>
                          <div>
                            {session.insights.emotion_summary
                              .dominant_emotion && (
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                                  session.insights.emotion_summary
                                    .dominant_emotion === "joy"
                                    ? "bg-green-100 text-green-800"
                                    : session.insights.emotion_summary
                                        .dominant_emotion === "sadness"
                                    ? "bg-blue-100 text-blue-800"
                                    : session.insights.emotion_summary
                                        .dominant_emotion === "anger"
                                    ? "bg-red-100 text-red-800"
                                    : session.insights.emotion_summary
                                        .dominant_emotion === "fear"
                                    ? "bg-purple-100 text-purple-800"
                                    : session.insights.emotion_summary
                                        .dominant_emotion === "surprise"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {
                                  session.insights.emotion_summary
                                    .dominant_emotion
                                }
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No emotion data available
                      </p>
                    )}
                  </div>

                  // Topics
                  <div>
                    <h3 className="text-lg font-medium mb-2">Topics</h3>
                    {session.insights.topics &&
                    session.insights.topics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {session.insights.topics.map((topic) => (
                          <span
                            key={topic.id}
                            className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm"
                          >
                            {topic.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        No topics identified
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
*/}

      </Tabs>
    </div>
  );
}
