import { useCallback, useRef } from "react";
import { sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useDashboard";
import { Message } from "@/lib/contexts/DashboardContext";


export function useSession() {
    const {
        currentSessionId,
        setCurrentSessionId,
        setIsLoading,
        setMessages,
        clearVisualizationCache,
    } = useDashboard();

    const isLoadingSessionRef = useRef<boolean>(false);
    const loadExistingSession = useCallback(async (sessionId: string) => {
        if (isLoadingSessionRef.current) {
            console.warn("Session is already loading, ignoring request for session:", sessionId);
            return;
        }

        const loadingToast = toast.loading("Loading session...")


        //* Try fetching session data
        try {
            setIsLoading(true);
            isLoadingSessionRef.current = true;
            clearVisualizationCache();
            console.log("Loading existing session:", sessionId);

            const session = await sessionApi.getSessionById(sessionId);
            if (!session) {
                toast.dismiss(loadingToast)
                toast.error("Session not found");
                if (currentSessionId){
                    console.warn("Session not found, redirecting to current session:", currentSessionId);
                    window.history.pushState({}, "", `/dashboard?session=${currentSessionId}`);
                }
                else {
                window.history.pushState({}, "", "/dashboard");
                }
                return;
            }

            // Update URL and current session ID
            if (window.location.search !== `?session=${session.id}`) {
            window.history.pushState({}, "", `/dashboard?session=${session.id}`);
            };

            // Update context and localStorage
            setCurrentSessionId(session.id);

            //* Try fetching session messages
            toast.loading("Loading messages...", { id : loadingToast});
            try {
                const messages = await sessionApi.getSessionMessages(session.id);
                // welcome message should always be first message even in history
                const formattedMessages: Message[] = [
                    {
                        id: "welcome-message",
                        content: "Welcome to DeepPurple! How can I help you with sentiment analysis today?",
                        role: "system" as const,
                        timestamp: new Date(),
                    }
                ]

                // add message history if available
                if (messages && messages.length > 0) {
                    messages.forEach((msg:any) => {
                        // Render the question if avaiable first
                        if (msg.question_text){
                            formattedMessages.push({
                                id: msg.id,
                                content: msg.question_text,
                                role: "user" as const,
                                timestamp: new Date(msg.created_at),
                            });
                        }

                        // Then add the ai response
                        if (msg.answer_text){
                            formattedMessages.push({
                                id: msg.id,
                                content: msg.answer_text,
                                role: "assistant" as const,
                                chartData: msg.chart_data,
                                chartType: msg.chart_type,
                                timestamp: new Date(msg.created_at),
                            });
                        }
                    });
                }
                setMessages(formattedMessages);

            // Error handling for message fetching
            } catch (err) {
                console.error("Error loading session messages:", err);
                toast.dismiss(loadingToast);
                toast.error("Failed to load session messages");
            }
        toast.dismiss(loadingToast);
        toast.success("Session loaded successfully");
        // Error handling for session loading
        } catch (error) {
            console.error("Error loading session:", error);
            toast.dismiss(loadingToast)
            toast.error("Failed to load session");
            if (currentSessionId) {
                console.warn("Session not found, redirecting to current session:", currentSessionId);
                window.history.pushState({}, "", `/dashboard?session=${currentSessionId}`);
            } else {
                console.warn("No current session ID, redirecting to dashboard");
                window.history.pushState({}, "", "/dashboard");
            }
        } finally {
            setIsLoading(false);
            isLoadingSessionRef.current = false;
        }
    }, [setCurrentSessionId, setMessages, clearVisualizationCache, setIsLoading]);

    // Return the functions to be used in components
    return {
        currentSessionId,
        loadExistingSession,
    };
}
