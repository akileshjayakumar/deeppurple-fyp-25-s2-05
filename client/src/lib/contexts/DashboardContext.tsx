import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { QuestionDataVisualization } from "@/types";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date;
  chartData?: any;
  chartType?: string;
  showVisualizeButton?: boolean | "hiding";
  showChartTypeButtons?: boolean;
}

export interface DashboardState {
    // Session State
    currentSessionId: string | null;
    isSessionInitialized: boolean;

    // Message State
    messages: Message[];

    // Visualization state
    visualizationData: QuestionDataVisualization | null;
    visualizationCacheKey: string | null;

    // UI State
    inputValue: string;
    isLoading: boolean;
    selectedFile: File | null;

    // refs
    isVisualizingRef: React.RefObject<boolean>;
    isFetchingVisDataRef: React.RefObject<boolean>;
}

export interface DashboardActions {
  // Session Actions
  setCurrentSessionId: (sessionId: string | null ) => void;
  setIsSessionInitialized: (isSessionInitialized: boolean) => void;

  // Message Actions
  setMessages: (messages: Message[] | ((prevMessages: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;

  // Visualization actions
  setVisualizationData: (data: QuestionDataVisualization | null) => void;
  setVisualizationCacheKey: (key: string | null) => void;

  // UI actions
  setInputValue: (value: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedFile: (file: File | null) => void;

  // complex actions
  resetToWelcomeMessage: () => void;
  clearVisualizationCache: () => void;
}

export type DashboardContextType = DashboardState & DashboardActions;

export const DashboardContext = createContext<DashboardContextType | undefined>(undefined);
