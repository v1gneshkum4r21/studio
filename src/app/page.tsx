import AppLayout from '@/components/layout/AppLayout';
import FileUploadSection from '@/components/excel-flow/FileUploadSection';
import PipelineSettingsSection from '@/components/excel-flow/PipelineSettingsSection';
import ResultsSection from '@/components/excel-flow/ResultsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function HomePage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Excel Processing Pipeline</h1>
          <p className="text-muted-foreground">Upload your files, configure settings, and get processed results.</p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <FileUploadSection />
            <PipelineSettingsSection />
          </div>
          <div className="lg:col-span-1">
            <ResultsSection />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
