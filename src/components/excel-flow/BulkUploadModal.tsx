"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileStatus {
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  message?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileStatuses: FileStatus[];
  overallStatus: "pending" | "uploading" | "completed" | "error";
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  fileStatuses,
  overallStatus,
}: BulkUploadModalProps) {
  const renderIcon = (status: FileStatus["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const successfulUploads = fileStatuses.filter(f => f.status === 'success').length;
  const failedUploads = fileStatuses.filter(f => f.status === 'error').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Bulk Upload Status</DialogTitle>
          <DialogDescription>
            {overallStatus === "uploading" && "Files are being uploaded. Please wait..."}
            {overallStatus === "completed" && `Upload process finished. ${successfulUploads} successful, ${failedUploads} failed.`}
            {overallStatus === "error" && "An error occurred during the bulk upload."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[300px] w-full pr-4">
          <div className="space-y-2">
            {fileStatuses.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 border rounded-md"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate" title={file.name}>{file.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {renderIcon(file.status)}
                  {file.message && <span className="text-xs text-muted-foreground">{file.message}</span>}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        {overallStatus !== "uploading" && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
