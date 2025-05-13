"use client";

import { useState } from "react";
import { Trash2, FileText, FileIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileInfo } from "@/types";
import { toast } from "sonner";
import { fileApi } from "@/lib/api";
import { FileUpload } from "./FileUpload";

interface FilesListProps {
  files: FileInfo[];
  onFileChange: () => void;
}

export function FilesList({ files, onFileChange }: FilesListProps) {
  const [expandUpload, setExpandUpload] = useState(false);

  const handleDelete = async (fileId: string) => {
    try {
      await fileApi.deleteFile(fileId);
      toast.success("File deleted successfully");
      onFileChange();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    }
  };

  const getFileIcon = (file: FileInfo) => {
    switch (file.type.toLowerCase()) {
      case "pdf":
        return <FileText className="h-5 w-5 text-red-500" />;
      case "csv":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "txt":
        return <FileText className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Files</CardTitle>
          <CardDescription>
            Files uploaded for analysis in this session
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpandUpload(!expandUpload)}
        >
          {expandUpload ? "Cancel" : "Upload"}
        </Button>
      </CardHeader>

      <CardContent>
        {expandUpload && (
          <div className="mb-6">
            <FileUpload
              onFileUploaded={() => {
                onFileChange();
                setExpandUpload(false);
              }}
            />
          </div>
        )}

        {files.length > 0 ? (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <div className="flex items-center space-x-2">
                  {getFileIcon(file)}
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.type} · {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(file.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p>No files uploaded yet</p>
            <p className="text-xs mt-1">
              Upload files to analyze their content
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
