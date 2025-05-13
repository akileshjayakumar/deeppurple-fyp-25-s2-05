"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TextAnalysisResult as AnalysisResult } from "@/types";
import { EmotionChart } from "./EmotionChart";
import { SentimentChart } from "./SentimentChart";

interface TextAnalysisResultProps {
  result: AnalysisResult;
}

export function TextAnalysisResultView({ result }: TextAnalysisResultProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>
            AI-generated summary of the analyzed text
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>{result.summary}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>
              Positive, negative, and neutral sentiment distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentChart sentiment={result.sentiment} />
            <div className="mt-4 flex justify-center bg-muted/50 p-2 rounded-md">
              <div className="text-center">
                <div className="text-sm font-medium">Overall Sentiment</div>
                <div className="text-lg capitalize font-semibold">
                  {result.sentiment.overall}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emotion Analysis</CardTitle>
            <CardDescription>
              Distribution of emotional tones detected in text
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmotionChart emotions={result.emotions} />
            <div className="mt-4 flex justify-center bg-muted/50 p-2 rounded-md">
              <div className="text-center">
                <div className="text-sm font-medium">Dominant Emotion</div>
                <div className="text-lg capitalize font-semibold">
                  {result.emotions.dominant_emotion}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <CardDescription>Main topics identified in the text</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-secondary rounded-full px-3 py-1.5 flex items-center"
              >
                <span className="font-medium">{topic.name}</span>
                <span className="text-xs ml-2 text-muted-foreground">
                  {(topic.relevance * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
