"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TextAnalysisResult } from "@/types";
import { toast } from "sonner";

interface TextAnalysisFormProps {
  sessionId: string;
  onAnalysisComplete: (result: TextAnalysisResult) => void;
}

export function TextAnalysisForm({
  sessionId,
  onAnalysisComplete,
}: TextAnalysisFormProps) {
  const [text, setText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setIsAnalyzing(true);

    try {
      // In a real app, we would call the API
      // const result = await analysisApi.analyzeText(sessionId, text);

      // For now, we'll simulate a successful analysis
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock result
      const mockResult: TextAnalysisResult = {
        session_id: sessionId,
        text_id: `text-${Date.now()}`,
        emotions: {
          joy: 0.6,
          sadness: 0.1,
          anger: 0.05,
          fear: 0.05,
          surprise: 0.1,
          disgust: 0.1,
          dominant_emotion: "joy",
        },
        sentiment: {
          positive: 0.7,
          negative: 0.1,
          neutral: 0.2,
          overall: "positive",
        },
        topics: [
          { id: "1", name: "Product", relevance: 0.8 },
          { id: "2", name: "Service", relevance: 0.6 },
        ],
        summary:
          "This text discusses satisfaction with the product quality, with positive sentiments expressed throughout. There are mentions of good customer service, though some suggestions for improvement are made.",
      };

      onAnalysisComplete(mockResult);
      toast.success("Text analyzed successfully");
      setText("");
    } catch (error) {
      console.error("Error analyzing text:", error);
      toast.error("Failed to analyze text");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyze Text</CardTitle>
        <CardDescription>
          Enter text to analyze sentiment, emotions, and topics
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <Textarea
            placeholder="Paste or type text to analyze..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-40 resize-none"
            disabled={isAnalyzing}
          />
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Enter content for sentiment and emotion analysis
          </div>
          <Button type="submit" disabled={isAnalyzing || !text.trim()}>
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
