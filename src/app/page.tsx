
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
    // Append to existing or replace, depending on desired logic. Here, we append.
    setUploadedTemplateFiles(prev => [...prev, ...files]);
  };

  const handleVendorsUploaded = (files: UploadedBackendFile[]) => {
    // Assuming only one vendor file is primarily used by the backend based on ProcessRequest
    // If multiple are uploaded, the backend /process endpoint takes a single vendor string.
    // We'll store all, but PipelineSettingsSection will likely use the first or last.
    setUploadedVendorFiles(prev => [...prev, ...files]);
  };

  const handlePipelineExecuted = (runId: string) => {
    setCurrentRunId(runId);
    // Optionally clear uploaded files from state if they are considered "consumed" by the run
    // setUploadedTemplateFiles([]);
    // setUploadedVendorFiles([]);
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
              // Keying by currentRunId might not be desired if we want to stage files for multiple runs
              // Consider removing the key or using a different strategy if files should persist across runs.
            />
            <PipelineSettingsSection
              templateFileIds={uploadedTemplateFiles.map(f => f.id)}
              vendorFileIds={uploadedVendorFiles.map(f => f.id)} // Pass all, component will select one for /process
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
