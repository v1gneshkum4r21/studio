
'use client';

import { useState, ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileText, XCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocalFile {
  id: string; // Used for UI key, e.g., file.name + Date.now()
  name: string;
  size: number;
  type: string;
  fileObject: File;
  progress?: number; // For local simulation if needed, or actual upload progress
}

export interface UploadedBackendFile {
  id: string; // This will be the ID/filename returned by the backend
  name: string; // Can be the same as id or a display name
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}

const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints';

const getApiEndpoint = (pathKey: string, method: 'GET' | 'POST' | 'DELETE'): ApiEndpoint | undefined => {
  try {
    const storedEndpoints = localStorage.getItem(API_ENDPOINTS_STORAGE_KEY);
    if (storedEndpoints) {
      const endpoints: ApiEndpoint[] = JSON.parse(storedEndpoints);
      return endpoints.find(ep => ep.path === pathKey && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

interface FileUploadSectionProps {
  onTemplatesUploaded: (files: UploadedBackendFile[]) => void;
  onVendorsUploaded: (files: UploadedBackendFile[]) => void;
}

export default function FileUploadSection({ onTemplatesUploaded, onVendorsUploaded }: FileUploadSectionProps) {
  const [templateFiles, setTemplateFiles] = useState<LocalFile[]>([]);
  const [vendorFiles, setVendorFiles] = useState<LocalFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const vendorFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<LocalFile[]>>
  ) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map((file) => ({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        fileObject: file,
        progress: 0,
      }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
     // Reset the input value to allow uploading the same file again
    if (event.target) {
      event.target.value = "";
    }
  };

  const removeFile = (
    id: string,
    setFiles: React.Dispatch<React.SetStateAction<LocalFile[]>>
  ) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  const uploadFiles = async (
    filesToUpload: LocalFile[],
    endpointPath: string,
    fileType: string,
    onSuccessCallback: (uploadedFiles: UploadedBackendFile[]) => void
  ): Promise<boolean> => {
    const apiEndpoint = getApiEndpoint(endpointPath, 'POST');
    if (!apiEndpoint) {
      toast({
        title: `Upload Configuration Error for ${fileType} files`,
        description: `The API endpoint '${endpointPath}' (POST) is not configured. Please define it in API Docs.`,
        variant: "destructive",
        duration: 7000,
      });
      return false;
    }

    const formData = new FormData();
    filesToUpload.forEach(file => {
      formData.append('files', file.fileObject, file.name);
    });

    try {
      const response = await fetch(`http://localhost:8000${apiEndpoint.path}`, { // Assuming FastAPI runs on port 8000
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown upload error' }));
        throw new Error(errorData.detail || `Failed to upload ${fileType} files. Status: ${response.status}`);
      }

      const result = await response.json();
      const backendFiles: UploadedBackendFile[] = result.uploaded_files.map((fileId: string) => ({
        id: fileId,
        name: fileId, // Or derive name if backend provides more info
      }));
      
      onSuccessCallback(backendFiles); // Pass backend confirmed files to parent
      
      toast({
        title: `${fileType} Files Uploaded`,
        description: `${backendFiles.length} file(s) uploaded successfully. Backend IDs: ${backendFiles.map(f => f.id).join(', ')}`,
        variant: 'default',
        className: "bg-accent text-accent-foreground"
      });
      return true;
    } catch (error: any) {
      toast({
        title: `Upload Failed for ${fileType} files`,
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (templateFiles.length === 0 && vendorFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select template or vendor files to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    let allUploadsSuccessful = true;

    if (templateFiles.length > 0) {
      const success = await uploadFiles(templateFiles, '/template/upload', 'Template', onTemplatesUploaded);
      if (success) {
        setTemplateFiles([]); // Clear local list on successful upload
      } else {
        allUploadsSuccessful = false;
      }
    }
    if (vendorFiles.length > 0) {
      const success = await uploadFiles(vendorFiles, '/vendor/upload', 'Vendor', onVendorsUploaded);
      if (success) {
        setVendorFiles([]); // Clear local list on successful upload
      } else {
        allUploadsSuccessful = false;
      }
    }
    
    setIsUploading(false);
    if (allUploadsSuccessful && (templateFiles.length > 0 || vendorFiles.length > 0)) {
       toast({
          title: "All Selected Files Processed for Upload",
          description: "Uploads initiated. Check individual toasts for status.",
          variant: "default",
        });
    } else if (!allUploadsSuccessful) {
        // Individual error toasts would have already appeared
    }
  };
  
  const FileListDisplay = ({ files, setFilesFunction, typeLabel }: { files: LocalFile[], setFilesFunction: React.Dispatch<React.SetStateAction<LocalFile[]>>, typeLabel: string }) => {
    return (
      <div className="space-y-2 mt-4">
        {files.map((file) => (
          <div key={file.id} className="flex items-center justify-between p-2 border rounded-md shadow-sm bg-secondary/30">
            <div className="flex items-center gap-2 flex-grow min-w-0">
              <FileText className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {/* Progress bar could be used if server sent progress, or for a more complex local simulation */}
              {/* {file.progress !== undefined && file.progress < 100 && file.progress > 0 && (
                <Progress value={file.progress} className="w-20 h-2" />
              )}
              {file.progress === 100 && <span className="text-xs text-green-600">Done</span>} */}
              <Button variant="ghost" size="icon" onClick={() => removeFile(file.id, setFilesFunction)} aria-label={`Remove ${file.name}`}>
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <UploadCloud className="mr-2 h-6 w-6 text-primary" /> File Upload &amp; Management
        </CardTitle>
        <CardDescription>Upload template and vendor Excel files. Files are sent to the backend. Ensure API endpoints are defined in API Docs and FastAPI server is running with CORS configured.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure 'POST' endpoints for '/template/upload' and '/vendor/upload' are defined on the API Docs page. The FastAPI server must be running on port 8000 and have CORS enabled for your frontend origin (e.g., http://localhost:9002).
            </AlertDescription>
        </Alert>

        <div>
          <Label htmlFor="template-files" className="text-base font-semibold">Template Files</Label>
          <Input
            id="template-files"
            type="file"
            multiple
            ref={templateFileInputRef}
            onChange={(e) => handleFileChange(e, setTemplateFiles)}
            className="mt-2"
            accept=".xlsx, .xls"
          />
          <FileListDisplay files={templateFiles} setFilesFunction={setTemplateFiles} typeLabel="template" />
          {templateFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTemplateFiles([])} className="mt-2 text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear Template Files Staging
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="vendor-files" className="text-base font-semibold">Vendor Files</Label>
          <Input
            id="vendor-files"
            type="file"
            multiple
            ref={vendorFileInputRef}
            onChange={(e) => handleFileChange(e, setVendorFiles)}
            className="mt-2"
            accept=".xlsx, .xls"
          />
          <FileListDisplay files={vendorFiles} setFilesFunction={setVendorFiles} typeLabel="vendor" />
           {vendorFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setVendorFiles([])} className="mt-2 text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear Vendor Files Staging
            </Button>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isUploading || (templateFiles.length === 0 && vendorFiles.length === 0)}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Staged Files
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will remove all template and vendor files currently staged for upload. This does not affect already uploaded files on the server.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setTemplateFiles([]);
                    setVendorFiles([]);
                    toast({ title: "All staged files cleared", variant: "default" });
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirm Clear Staging
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleUploadAll} disabled={isUploading || (templateFiles.length === 0 && vendorFiles.length === 0)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isUploading ? 'Uploading...' : 'Upload All Staged'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
