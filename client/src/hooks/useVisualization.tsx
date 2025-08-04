import { useCallback, useRef } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { QuestionDataVisualization } from "@/types";
import { Message } from "@/lib/contexts/DashboardContext";
import { toast } from "sonner";
import { analysisApi } from "@/lib/api";



export function useVisualization() {
    const {
        visualizationData,
        setVisualizationData,
        visualizationCacheKey,
        setVisualizationCacheKey,
        isVisualizingRef,
        isFetchingVisDataRef,
        setMessages,
        setIsLoading,
    } = useDashboard();



    const hideVisualizeButton = () => {
        setMessages((prevMessages) => {
            const idx = [...prevMessages].reverse().findIndex((msg) => msg.role === "assistant" && msg.showVisualizeButton);

            if (idx === -1) return prevMessages; // No assistant message found

            const realIdx = prevMessages.length - 1 - idx; // Get the actual index in the original array
            return prevMessages.map((msg, index) =>  index === realIdx ? { ...msg, showVisualizeButton: "hiding" } : msg);
        });

        // After animation duration, actually hide button and show chat type buttons
        setTimeout(() => {
        setMessages((prev) => {
            const idx = [...prev].reverse().findIndex(
            (msg) => msg.role === "assistant" && (msg.showVisualizeButton === "hiding" || msg.showVisualizeButton === true)
            );
            if (idx === -1) return prev;
            const realIdx = prev.length - 1 - idx;
            return prev.map((msg, index) =>
            index === realIdx
                ? { ...msg, showVisualizeButton: false, showChartTypeButtons: true }
                : msg
            );
        });
        }, 150);
    };

    const handleVisualizeClick = useCallback(async (sessionId: string | null) => {
        if (!sessionId) {
            toast.error("No active session");
            return;
        }
        if (isFetchingVisDataRef.current) {
            console.warn("Already fetching visualization data! please wait.");
            return;
        }

        const loadingToast = toast.loading("Loading visualization data...")
        try {
            isFetchingVisDataRef.current = true;

            // hide the visualization button
            hideVisualizeButton();

            // Fetch the visualization data when the button is clicked
            const currentCacheKey = `session-${sessionId}`;
            let response: QuestionDataVisualization;
            if (visualizationData && visualizationCacheKey === currentCacheKey) {
                // Use cached data if available
                response = visualizationData;
            } else {
                // Fetch new visualization data
                setIsLoading(true);
                response = await analysisApi.visualizeLastFile(sessionId);
                setVisualizationData(response);
                setVisualizationCacheKey(currentCacheKey);
            }

            // Check if the response is valid
            if (!response || !response.overview || !response.overview.emotion_distribution) {
                throw new Error("Invalid visualization data received");
            }
            toast.dismiss(loadingToast)
            toast.success("Visualization data loaded successfully!");


        } catch (error) {
            toast.dismiss(loadingToast)
            console.error("Error in handleVisualizeClick:", error);
            toast.error("Failed to load visualization data");
             // If theres no visualization show the button again
            setMessages((prev) => {
                const idx = [...prev].reverse().findIndex((msg) => msg.role === "assistant" && msg.showChartTypeButtons);
                if (idx === -1) return prev;
                const realIdx = prev.length - 1 - idx;
                return prev.map((msg, index) =>index === realIdx ? { ...msg, showVisualizeButton: true, showChartTypeButtons: false } : msg);
            });
        } finally {
            isFetchingVisDataRef.current = false;
            setIsLoading(false);
        }
    }, [setMessages, visualizationData, visualizationCacheKey, setVisualizationData, setVisualizationCacheKey, setIsLoading]);

    const handleChartTypeClick = useCallback(async (sessionId: string | null,chartType: string) => {

        if (!sessionId) {
            toast.error("No active session");
            return;
        }
        if (isFetchingVisDataRef.current) {
            console.warn("Still fetching data, please wait.");
            return;
        }
        if (isVisualizingRef.current) {
            console.warn("Already visualizing data, please wait.");
            return;
        }

        try {
            isVisualizingRef.current = true;
            const formattedChartType = chartType.replace(/_/g, " ");
            const userMessageContent = `Show me the ${formattedChartType} chart for the last file uploaded.`;
            let aiMessageContent = ``;

            const userMessage: Message = {
                id: `user-${Date.now()}`,
                content: userMessageContent,
                role: "user",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);

            // Add loading message
            const loadingMessage: Message = {
                id: `loading-${Date.now()}`,
                content: `Loading ${formattedChartType} chart...`,
                role: "assistant",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, loadingMessage]);
            setIsLoading(true);

            // Use the cached visualization data if available
            const response = visualizationData;
            if (!response || !response.overview) {
                throw new Error("Invalid visualization data received");
            }

            // Update the loading message with chart data
            let chartData;
            if (chartType === "emotion_distribution") {
                if (!response.overview.emotion_distribution) {
                    throw new Error("Emotion distribution data is not available");
                }
                aiMessageContent = `Here is the spider chart of ${formattedChartType}!`
                chartData = response.overview.emotion_distribution;
            }
            else if (chartType === "key_topics") {
                if (!response.overview.key_topics) {
                    throw new Error("Key topics data is not available");
                }
                aiMessageContent = `Here is the bar chart of ${formattedChartType}!`
                chartData = response.overview.key_topics;
            }
            else {
                throw new Error("Unsupported chart type");
            }

            // Create the chart message
            const chartMessage: Message = {
                id: `chart-${Date.now()}`,
                content: aiMessageContent,
                role: "assistant",
                chartData: chartData,
                chartType: chartType,
                showVisualizeButton: false,
                showChartTypeButtons: false,
                timestamp: new Date(),
            };

            // replace loading message with chart message
            setMessages(
                (prev) => prev.map ((msg) => msg.id === loadingMessage.id ? chartMessage : msg)
            )

            analysisApi.askVisualizeQuestion(
                sessionId,
                userMessageContent,
                aiMessageContent,
                JSON.stringify(chartData),
                chartType
            );
        } catch (error) {
            console.error("Error handling chart type click:", error);
            toast.error("Failed to visualize chart data");
            // If theres error, replace loading message with error message
            setMessages((prev) => {
                const idx = [...prev].reverse().findIndex((msg) => msg.role === "assistant" && msg.id.startsWith("loading-"));
                if (idx === -1) return prev;
                const realIdx = prev.length - 1 - idx;
                return prev.map((msg, index) =>
                    index === realIdx
                        ? { ...msg, content: "Failed to visualize chart data. Please try again.", showVisualizeButton: true, showChartTypeButtons: false }
                        : msg
                );
            });
        } finally {
            isVisualizingRef.current = false;
            setIsLoading(false);
        }

    }, [setMessages,visualizationData]);

    return {
        handleVisualizeClick,
        handleChartTypeClick
        };
    }
