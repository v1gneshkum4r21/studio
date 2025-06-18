
'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import FileUploadSection, { type UploadedBackendFile } from '@/components/excel-flow/FileUploadSection';
import { Button } from '@/components/ui/button';
import { Workflow } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const [uploadedTemplateFiles, setUploadedTemplateFiles] = useState<UploadedBackendFile[]>([]);
  const [uploadedVendorFiles, setUploadedVendorFiles] = useState<UploadedBackendFile[]>([]);

  const handleTemplatesUploaded = (files: UploadedBackendFile[]) => {
    setUploadedTemplateFiles(prev => [...prev, ...files]);
  };

  const handleVendorsUploaded = (files: UploadedBackendFile[]) => {
    setUploadedVendorFiles(prev => [...prev, ...files]);
  };

  const hasFilesReadyForProcessing = uploadedTemplateFiles.length > 0 && uploadedVendorFiles.length > 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Excel Processing Pipeline - Upload</h1>
          <p className="text-muted-foreground">Upload your template and vendor files here. Then proceed to execute the pipeline.</p>
        </div>

        <FileUploadSection
          onTemplatesUploaded={handleTemplatesUploaded}
          onVendorsUploaded={handleVendorsUploaded}
        />

        { (uploadedTemplateFiles.length > 0 || uploadedVendorFiles.length > 0) && (
          <Card className="shadow-md mt-8">
            <CardHeader>
              <CardTitle className="font-headline text-xl">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              {hasFilesReadyForProcessing ? (
                <Alert variant="default" className="bg-accent/10 border-accent/30 mb-4">
                  <Workflow className="h-5 w-5 text-accent" />
                  <AlertTitle className="font-semibold text-accent">Files Ready!</AlertTitle>
                  <AlertDescription>
                    You have uploaded {uploadedTemplateFiles.length} template file(s) and {uploadedVendorFiles.length} vendor file(s).
                    You can now proceed to the execution page to configure and run the pipeline.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="mb-4">
                  <AlertTitle className="font-semibold">Missing Files</AlertTitle>
                  <AlertDescription>
                    {uploadedTemplateFiles.length === 0 && "Please upload at least one template file. "}
                    {uploadedVendorFiles.length === 0 && "Please upload at least one vendor file."}
                  </AlertDescription>
                </Alert>
              )}
              <Link href="/execute" passHref>
                <Button className="w-full" disabled={!hasFilesReadyForProcessing}>
                  <Workflow className="mr-2 h-4 w-4" />
                  Go to Execute Pipeline Page
                </Button>
              </Link>
               <p className="text-xs text-muted-foreground mt-2 text-center">
                On the Execute Pipeline page, you will be able to select from all uploaded files to start a new processing run.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
