"use client";

import { useState, useRef } from "react";
import { Upload, X, File, FileText, FileUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { fileApi } from "@/lib/api";
import { useParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { analysisApi } from "@/lib/api";

interface FileUploadProps {
  onFileUploaded: () => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [directText, setDirectText] = useState("");
  const [submittingText, setSubmittingText] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      return;
    }

    // Enhanced file validation
    const allowedTypes = [
      "text/plain",
      "text/csv",
      "application/pdf",
      "application/vnd.ms-excel",
    ];
    const allowedExtensions = [".txt", ".csv", ".pdf"];

    // Check by MIME type
    let isAllowedType = allowedTypes.includes(file.type);

    // If MIME type check fails, check by file extension
    if (!isAllowedType) {
      const extension = file.name
        .toLowerCase()
        .slice(file.name.lastIndexOf("."));
      isAllowedType = allowedExtensions.includes(extension);
    }

    if (!isAllowedType) {
      toast.error("Only TXT, CSV, and PDF files are allowed");
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 100);

    try {
      console.log("Uploading file to session:", sessionId);

      // Make sure sessionId is passed as a number (API expects integer)
      const numericSessionId = parseInt(sessionId, 10);
      if (isNaN(numericSessionId)) {
        throw new Error("Invalid session ID");
      }

      const response = await fileApi.uploadFile(numericSessionId, file);
      console.log("Upload response:", response);

      setProgress(100);
      toast.success(`File ${file.name} uploaded successfully`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onFileUploaded();
    } catch (error: any) {
      console.error("Error uploading file:", error);

      // Prefer backend error message if available
      if (error.response?.data && typeof error.response.data === "object" && error.response.data.detail) {
        toast.error(error.response.data.detail);
      } else if (error.response?.data && typeof error.response.data === "string") {
        toast.error(error.response.data);
      } else if (error.response?.status === 413) {
        toast.error(
          "File is too large. Please upload a smaller file (max 10MB)."
        );
      } else if (error.response?.status === 415) {
        toast.error(
          "Unsupported file type. Please use TXT, CSV, or PDF files."
        );
      } else if (error.response?.status === 400) {
        toast.error(
          "Invalid file or session. Please try again with a valid file."
        );
      } else {
        toast.error(
          error.message || "Failed to upload file. Please ensure the file is valid and try again."
        );
      }
    } finally {
      clearInterval(interval);
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!directText.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setSubmittingText(true);

    try {
      const numericSessionId = parseInt(sessionId, 10);
      if (isNaN(numericSessionId)) {
        throw new Error("Invalid session ID");
      }

      await analysisApi.analyzeText(numericSessionId.toString(), directText);
      toast.success("Text submitted for analysis");
      setDirectText("");
      onFileUploaded(); // Trigger refresh to show results
    } catch (error) {
      console.error("Error submitting text:", error);
      toast.error("Failed to submit text for analysis. Please try again.");
    } finally {
      setSubmittingText(false);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return <FileText className="h-6 w-6 text-red-500" />;
      case "csv":
        return <FileText className="h-6 w-6 text-green-500" />;
      case "txt":
        return <File className="h-6 w-6 text-blue-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          file
            ? "border-primary"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !file && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.csv,.pdf"
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center space-y-2 cursor-pointer">
            <FileUp className="h-8 w-8 text-muted-foreground" />
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">
                Drag & drop a file or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports TXT, CSV, and PDF files
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(file.name)}
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                cancelUpload();
              }}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {file && (
        <div className="space-y-2">
          {uploading && <Progress value={progress} className="h-2 w-full" />}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cancelUpload}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center space-x-1"
            >
              {uploading ? (
                <>Uploading...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Direct text input option */}
      <div className="mt-6 border-t pt-4">
        <p className="text-sm font-medium mb-2">Or paste text directly:</p>
        <div className="space-y-2">
          <Textarea
            placeholder="Paste text content to analyze here..."
            value={directText}
            onChange={(e) => setDirectText(e.target.value)}
            className="min-h-[100px]"
            disabled={submittingText}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleTextSubmit}
              disabled={!directText.trim() || submittingText}
              className="flex items-center"
            >
              {submittingText ? (
                "Processing..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-1" />
                  Analyze Text
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
