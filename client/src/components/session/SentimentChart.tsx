"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SentimentSummary } from "@/types";

interface SentimentChartProps {
  sentiment: SentimentSummary;
}

export function SentimentChart({ sentiment }: SentimentChartProps) {
  // Transform the sentiment summary into the format expected by the bar chart
  const chartData = [
    {
      name: "Positive",
      value: sentiment.positive,
      fill: "#4ade80", // green
    },
    {
      name: "Neutral",
      value: sentiment.neutral,
      fill: "#94a3b8", // gray
    },
    {
      name: "Negative",
      value: sentiment.negative,
      fill: "#f87171", // red
    },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          width={500}
          height={300}
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 1]} />
          <Tooltip
            formatter={(value: number) => [
              (value * 100).toFixed(1) + "%",
              "Score",
            ]}
          />
          <Bar dataKey="value" name="Score" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
