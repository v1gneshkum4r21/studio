
'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import FileUploadSection, { type UploadedBackendFile } from '@/components/excel-flow/FileUploadSection';
import PipelineSettingsSection from '@/components/excel-flow/PipelineSettingsSection';
import ResultsSection from '@/components/excel-flow/ResultsSection';

export default function HomePage() {
  const [uploadedTemplateFiles, setUploadedTemplateFiles] = useState<UploadedBackendFile[]>([]);
  const [uploadedVendorFiles, setUploadedVendorFiles] = useState<UploadedBackendFile[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);

  const handleTemplatesUploaded = (files: UploadedBackendFile[]) => {
    setUploadedTemplateFiles(files);
  };

  const handleVendorsUploaded = (files: UploadedBackendFile[]) => {
    setUploadedVendorFiles(files);
  };

  const handlePipelineExecuted = (runId: string) => {
    setCurrentRunId(runId);
    // Clear uploaded files after starting a run, as they are now processed
    setUploadedTemplateFiles([]);
    setUploadedVendorFiles([]);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Excel Processing Pipeline</h1>
          <p className="text-muted-foreground">Upload your files, configure settings, and get processed results.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <FileUploadSection
              onTemplatesUploaded={handleTemplatesUploaded}
              onVendorsUploaded={handleVendorsUploaded}
              key={currentRunId} // Re-mount to clear local files after execution
            />
            <PipelineSettingsSection
              templateFileIds={uploadedTemplateFiles.map(f => f.id)}
              vendorFileIds={uploadedVendorFiles.map(f => f.id)}
              onPipelineExecuted={handlePipelineExecuted}
              hasFilesToProcess={uploadedTemplateFiles.length > 0 && uploadedVendorFiles.length > 0}
            />
          </div>
          <div className="lg:col-span-1">
            <ResultsSection runId={currentRunId} key={currentRunId} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
