import { useCallback, useRef } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { toast } from "sonner";
import { Message } from "@/lib/contexts/DashboardContext";
import { sessionApi, analysisApi } from "@/lib/api";




export function useMessage() {
    const {
        setMessages,
        addMessage,
        updateMessage,
        currentSessionId,
        setCurrentSessionId,
        inputValue,
        setInputValue,
        selectedFile,
        setSelectedFile,
        isLoading,
        setIsLoading,
        clearVisualizationCache,
    }  = useDashboard();

    const handleSendMessage = useCallback(async() => {
        if (!inputValue.trim() && !selectedFile) {
            toast.error("Please enter a message or select a file to send.");
            return;
        }

        if (isLoading) {
            toast.error("Please wait for the current request to finish.");
            return;
        }

        if (!currentSessionId) {
            toast.error("No active session. Please refresh the page or create a new one.")
            return;
        }
        setIsLoading(true);
        const loadingToast = toast.loading("Sending message..")

        // Check if message is first in session
        try {
            const currentSessionData = await sessionApi.getSessionById(currentSessionId);
            if (currentSessionData?.name === "New Conversation" && inputValue.trim()) {
                // Update session name if it's still "New Conversation"
                await sessionApi.updateSession(currentSessionId, { name: inputValue.trim() });
            }
        } catch (error) {
            console.error("Failed to update session name:", error);
            toast.error("Failed to update session name. Please try again.");
            setIsLoading(false);
            return;
        }

        // Add user message
        let content_msg: string | null = null
        if (selectedFile && inputValue.trim()){
            content_msg = `[File: ${selectedFile.name}] ${inputValue.trim()}`
        } else {
            content_msg =selectedFile ? `[File: ${selectedFile.name}]` : (inputValue.trim()) ? inputValue.trim() : ""
        }
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            content: content_msg,
            role: "user",
            timestamp: new Date(),
        };
        addMessage(userMessage);

        // Save current input and file
        const currentInput = inputValue.trim();
        const currentFile = selectedFile;

        // Clear input and file state
        setInputValue("");
        setSelectedFile(null);

        // Streaming Response
        const aiMessageId = `ai-${Date.now()}`;
        const placeHolderMessage : Message = {
            id: aiMessageId,
            content: "",
            role: "assistant",
            timestamp: new Date(),
        };
        addMessage(placeHolderMessage);

        // Handle question answer
        try {
            // Util handlers
            let accumulatedResponse = "";
            const handleToken = (token: string) => {
                if (token === "PROCESSING_START") {
                    updateMessage(aiMessageId, { content: "Processing your file..." });
                    return;
                }

                if (token === "PROCESSING_END") {
                    accumulatedResponse = "";
                    updateMessage(aiMessageId, { content: "" });
                    return;
                }

                accumulatedResponse += token;
                updateMessage(aiMessageId, { content: accumulatedResponse });
            }

            const handleUploadProgress = (progress: number) => {
                console.log(`Upload progress: ${progress}%`);
            };
            // File upload answer
            if (currentFile){
                toast.loading("Uploading and analyzing file...", {id : loadingToast})
                // Streaming version for file uploads
                await analysisApi.streamQuestionWithFile(
                    currentSessionId as string,
                    currentInput || "Please analyze this file",
                    currentFile,
                    handleToken,
                    handleUploadProgress
                );
                // After file is uploaded and processed, we clear the visualization cache
                clearVisualizationCache();

                // After successful upload and analysis -> show visualize button &  remove from previous messages
                setMessages((prevMessages) =>
                    prevMessages.map(msg =>
                        msg.id === aiMessageId
                        ? { ...msg, showVisualizeButton: true}
                        : { ...msg, showVisualizeButton: undefined }
                    )
                );
                } else {
                // Handle question without file upload
                toast.loading("Analyzing text...", {id : loadingToast})
                await analysisApi.streamQuestion(currentSessionId as string, currentInput, handleToken);
                }
            } catch (AnswerError) {
                toast.error("Failed to answer query.");
                console.error("Answer error:", AnswerError);
                updateMessage(aiMessageId, { content: "Failed to answer query." });
            } finally {
                setIsLoading(false);
                toast.dismiss(loadingToast)
            }

            // If session was created, we reset to welcome message


    },[
        inputValue,
        selectedFile,
        isLoading,
        currentSessionId,
        setCurrentSessionId,
        addMessage,
        updateMessage,
        setInputValue,
        setSelectedFile,
        setIsLoading,
        clearVisualizationCache,
        setMessages
    ])


    // return
    return {
        handleSendMessage,
    };
}
