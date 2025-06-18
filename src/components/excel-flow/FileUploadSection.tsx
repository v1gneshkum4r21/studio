
'use client';

import { useState, ChangeEvent, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileText, XCircle, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress?: number;
  fileObject: File;
}

export default function FileUploadSection() {
  const [templateFiles, setTemplateFiles] = useState<UploadedFile[]>([]);
  const [vendorFiles, setVendorFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const vendorFileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files).map((file) => ({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        fileObject: file,
      }));
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    }
  };

  const removeFile = (
    id: string,
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>
  ) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  };

  const simulateUpload = (files: UploadedFile[], setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    files.forEach(file => {
      if (file.progress === 0 || file.progress === undefined) { // Only upload new files
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 10;
          if (currentProgress <= 100) {
            setFiles(prev => prev.map(f => f.id === file.id ? {...f, progress: currentProgress} : f));
          } else {
            clearInterval(interval);
            setFiles(prev => prev.map(f => f.id === file.id ? {...f, progress: 100} : f));
          }
        }, 200);
      }
    });
  };

  const handleUploadAll = () => {
    if (templateFiles.length === 0 && vendorFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select template or vendor files to upload.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    simulateUpload(templateFiles, setTemplateFiles);
    simulateUpload(vendorFiles, setVendorFiles);

    // Simulate upload completion
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "Upload Complete",
        description: `${templateFiles.length + vendorFiles.length} file(s) processed.`,
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
    }, 2500); // Adjust time as needed
  };
  
  const FileList = ({ files, setFiles, type }: { files: UploadedFile[], setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>, type: string }) => {
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
              {file.progress !== undefined && file.progress < 100 && (
                <Progress value={file.progress} className="w-20 h-2" />
              )}
              {file.progress === 100 && <span className="text-xs text-green-600">Done</span>}
              <Button variant="ghost" size="icon" onClick={() => removeFile(file.id, setFiles)} aria-label={`Remove ${file.name}`}>
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
        <CardDescription>Upload template and vendor Excel files for processing. You can upload multiple files at once.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="template-files" className="text-base font-semibold">Template Files</Label>
          <Input
            id="template-files"
            type="file"
            multiple
            ref={templateFileInputRef}
            onChange={(e) => handleFileChange(e, setTemplateFiles)}
            className="mt-2"
            accept=".xlsx, .xls, .csv"
          />
          <FileList files={templateFiles} setFiles={setTemplateFiles} type="template" />
          {templateFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setTemplateFiles([])} className="mt-2 text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear Template Files
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
            accept=".xlsx, .xls, .csv"
          />
          <FileList files={vendorFiles} setFiles={setVendorFiles} type="vendor" />
           {vendorFiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setVendorFiles([])} className="mt-2 text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Clear Vendor Files
            </Button>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
           <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={templateFiles.length === 0 && vendorFiles.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" /> Clear All Files
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will remove all selected template and vendor files. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setTemplateFiles([]);
                    setVendorFiles([]);
                    toast({ title: "All files cleared", variant: "default" });
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirm Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleUploadAll} disabled={isUploading || (templateFiles.length === 0 && vendorFiles.length === 0)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <UploadCloud className="mr-2 h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload All'}
          </Button>
        </div>
        {isUploading && <Progress value={(templateFiles.filter(f=>f.progress === 100).length + vendorFiles.filter(f=>f.progress === 100).length) / (templateFiles.length + vendorFiles.length || 1) * 100} className="w-full h-2 mt-2" />}

      </CardContent>
    </Card>
  );
}
