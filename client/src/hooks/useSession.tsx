import { useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sessionApi } from "@/lib/api";
import { toast } from "sonner";
import { useDashboard } from "@/hooks/useDashboard";
import { Message } from "@/lib/contexts/DashboardContext";
import { clear } from "console";

export function useSession() {
    const router = useRouter()
    const searchParams = useSearchParams();
    const {
        currentSessionId,
        setCurrentSessionId,
        setIsCreatingSession,
        setIsLoading,
        setMessages,
        clearVisualizationCache,
    } = useDashboard();

    const loadExistingSession = useCallback(async (sessionId: string) => {
        //* Try fetching session data
        try {
            setIsLoading(true);
            clearVisualizationCache();
            console.log("Loading existing session:", sessionId);

            const session = await sessionApi.getSessionById(sessionId);
            if (!session) {
                toast.error("Session not found");
                return;
            }

            // Update URL and current session ID
            window.history.pushState({}, "", `/dashboard?sessionId=${session.id}`);
            setCurrentSessionId(session.id);

            //* Try fetching session messages
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
                toast.error("Failed to load session messages");
            }

        // Error handling for session loading
        } catch (error) {
            console.error("Error loading session:", error);
            toast.error("Failed to load session");
        } finally {
            setIsLoading(false);
        }
    }, [setCurrentSessionId, setMessages, clearVisualizationCache, setIsLoading]);


    const createNewSession = useCallback(async(name: string = "New Conversation") => {
        try {
            setIsCreatingSession(true);
            const newSession = await sessionApi.createSession(name);

            // update url & current session ID
            window.history.pushState({}, "", `/dashboard?sessionId=${newSession.id}`);
            setCurrentSessionId(newSession.id);
        }
        catch (error) {
            console.error("Error creating new session:", error);
            toast.error("Failed to create new session");
        }
        finally {
            setIsCreatingSession(false);
        }
    }, [setCurrentSessionId, setIsCreatingSession]);

    const findMostRecentSession = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await sessionApi.getSessions();
            const sessionList = [...response.sessions].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // User has no sessions , create new one
            if (sessionList.length === 0 ) {
                await createNewSession();
                return;
            }
            // User has sessions load the most receont
            if (sessionList.length > 0) {
                const mostRecentSession = sessionList[0];
                setCurrentSessionId(mostRecentSession.id);
                await loadExistingSession(mostRecentSession.id);
            }
        }
        catch (error) {}
        finally {
            setIsLoading(false);
        }

    }, [setIsLoading, loadExistingSession, createNewSession])

    // Load session from URL parameter or find the most recent session
    useEffect(() => {
        const sessionId = searchParams.get("sessionId");
        clearVisualizationCache();
        //
        if (sessionId) {
            loadExistingSession(sessionId);
        } else {
            findMostRecentSession();
        }
    },[searchParams, loadExistingSession, findMostRecentSession, clearVisualizationCache]);

    // Return the functions to be used in components
    return {
        currentSessionId,
        loadExistingSession,
        createNewSession,
        findMostRecentSession
    };
}
