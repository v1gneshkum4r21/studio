'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResultFile {
  id: string;
  name: string;
  size: string;
  type: 'Excel' | 'JSON' | 'Log';
}

const mockResults: ResultFile[] = [
  { id: '1', name: 'processed_data.xlsx', size: '2.5 MB', type: 'Excel' },
  { id: '2', name: 'summary_report.json', size: '512 KB', type: 'JSON' },
  { id: '3', name: 'processing_log.txt', size: '12 KB', type: 'Log' },
];

export default function ResultsSection() {
  const [results, setResults] = useState<ResultFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching results
    setTimeout(() => {
      setResults(mockResults);
      setIsLoading(false);
    }, 1500);
  }, []);

  const handleDownloadFile = (fileName: string) => {
    toast({
      title: `Downloading ${fileName}`,
      description: "Your download will start shortly.",
      variant: "default",
    });
    // Actual download logic would go here
  };

  const handleDownloadAll = () => {
    setIsDownloadingAll(true);
    toast({
      title: "Preparing Zip Archive",
      description: "This may take a moment...",
      variant: "default",
    });
    // Simulate zip creation and download
    setTimeout(() => {
      setIsDownloadingAll(false);
      toast({
        title: "Archive Downloaded",
        description: "results_archive.zip has been downloaded.",
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
    }, 2500);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <FileArchive className="mr-2 h-6 w-6 text-primary" /> Results &amp; Output
          </CardTitle>
          <CardDescription>Generated files from the pipeline execution will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading results...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <FileArchive className="mr-2 h-6 w-6 text-primary" /> Results &amp; Output
        </CardTitle>
        <CardDescription>Download your processed files individually or as a zip archive.</CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No results available yet. Execute a pipeline to see results.</p>
        ) : (
          <div className="space-y-3">
            {results.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-card">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size} - {file.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(file.name)} aria-label={`Download ${file.name}`}>
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ))}
            <Button onClick={handleDownloadAll} disabled={isDownloadingAll} className="w-full mt-4">
              {isDownloadingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloadingAll ? 'Preparing Archive...' : 'Download All as Zip'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
