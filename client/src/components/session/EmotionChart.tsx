"use client";

import React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { EmotionSummary } from "@/types";

interface EmotionChartProps {
  emotions: EmotionSummary;
}

export function EmotionChart({ emotions }: EmotionChartProps) {
  // Transform the emotion summary into the format expected by the radar chart
  const chartData = [
    { emotion: "Joy", value: emotions.joy },
    { emotion: "Sadness", value: emotions.sadness },
    { emotion: "Anger", value: emotions.anger },
    { emotion: "Fear", value: emotions.fear },
    { emotion: "Surprise", value: emotions.surprise },
    { emotion: "Disgust", value: emotions.disgust },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="emotion" />
          <Radar
            name="Emotions"
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
