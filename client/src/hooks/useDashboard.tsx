"use client";
import { useContext } from "react";
import { DashboardContext, DashboardContextType } from '@/lib/contexts/DashboardContext';

export function useDashboard(): DashboardContextType {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error("useDashboard must be used within a DashboardProvider");
    }
    return context;
}