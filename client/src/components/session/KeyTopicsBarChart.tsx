"use client";
import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
}
from "recharts";

interface KeyTopicsBarChartProps {
    data: { topic: string; relevance_score: number }[] | null;
}

export function KeyTopicsBarChart({ data }: KeyTopicsBarChartProps) {
    // Defensive check to ensure data is available
    if (!data || data.length === 0) {
        return <div className="text-red-500 p-4">No key topics data available</div>;
    }

    return (
        <div className="w-full border rounded-lg p-4 bg-gray-50 min-w-[500px]">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                Key Topics
            </h3>
            <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="topic" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="relevance_score" fill="#8b5cf6" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}