"use client";
import React from "react";
import {
    RadarChart, 
    Radar, 
    PolarGrid, 
    PolarAngleAxis,
    ResponsiveContainer
} from "recharts";

interface EmotionDistributionChartProps {
    data: { [emotion: string]: number } | null;
}

export function EmotionDistributionChart({ data }: EmotionDistributionChartProps) {
    // Defensive check to ensure data is available
    if (!data || Object.keys(data).length === 0) {
        return <div className="text-red-500 p-4">No emotion distribution data available</div>;
    }

    console.log('Chart data received:', data); // Debug log

    const chartData = Object.entries(data).map(
        ([emotion, value]) => ({ 
            emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1), // Capitalize emotion names
            value: Number(value) // Ensure values are numbers
        })
    );

    console.log('Formatted chart data:', chartData); // Debug log

    return (
        <div className="w-full h-80 border rounded-lg p-4 bg-gray-50 min-w-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                    <PolarGrid />
                    <PolarAngleAxis 
                        dataKey="emotion" 
                        className="text-sm font-medium"
                        tick={{ fontSize: 12, fill: '#374151' }}
                    />
                    <Radar
                        name="Emotions"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};