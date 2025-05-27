"use client";

import { useState } from "react";
import { Download, FileText, FileDown, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sessionApi } from "@/lib/api";
import { toast } from "sonner";

interface ExportOptionsProps {
  sessionId: string;
}

export function ExportOptions({ sessionId }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Helper function to download a blob
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const blob = await sessionApi.exportToCSV(sessionId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `session-${sessionId}-${timestamp}.csv`);
      toast.success("Session exported to CSV successfully");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Failed to export session to CSV");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to Markdown
  const handleExportMarkdown = async () => {
    try {
      setIsExporting(true);
      const blob = await sessionApi.exportToMarkdown(sessionId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `session-${sessionId}-${timestamp}.md`);
      toast.success("Session exported to Markdown successfully");
    } catch (error) {
      console.error("Error exporting to Markdown:", error);
      toast.error("Failed to export session to Markdown");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const blob = await sessionApi.exportToPDF(sessionId);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(blob, `session-${sessionId}-${timestamp}.pdf`);
      toast.success("Session exported to PDF successfully");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Failed to export session to PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium shadow-sm"
          disabled={isExporting}
        >
          <Download className="h-4 w-4" />
          <span>Export Report</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Conversation</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportCSV} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          <span>CSV Format</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMarkdown} disabled={isExporting}>
          <FileDown className="h-4 w-4 mr-2" />
          <span>Markdown Format</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          <span>PDF Format</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
