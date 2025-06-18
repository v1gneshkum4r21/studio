
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Interface and constant for API endpoint configuration
interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints';

// Helper function to get API endpoint from localStorage
const getApiEndpoint = (pathKey: string, method: 'GET' | 'POST' | 'DELETE'): ApiEndpoint | undefined => {
  try {
    const storedEndpoints = localStorage.getItem(API_ENDPOINTS_STORAGE_KEY);
    if (storedEndpoints) {
      const endpoints: ApiEndpoint[] = JSON.parse(storedEndpoints);
      // For paths with params, we allow a base path match for simplicity in this example
      // A more robust solution might involve regex or more structured path definitions
      return endpoints.find(ep => (ep.path === pathKey || pathKey.startsWith(ep.path.split(':')[0])) && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

// Helper to replace path parameters
const fillPathParameters = (pathWithParams: string, params: Record<string, string>): string => {
  let path = pathWithParams;
  for (const key in params) {
    path = path.replace(`:${key}`, params[key]);
  }
  return path;
};


export default function ResultsSection() {
  const [results, setResults] = useState<ResultFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const { toast } = useToast();
  const currentRunId = "latest_run"; // Placeholder for actual run ID logic

  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      const resultsEndpointPath = `/results/:run_id`; // As defined in API Docs
      const resultsEndpoint = getApiEndpoint(resultsEndpointPath, 'GET');

      if (!resultsEndpoint) {
        toast({
          title: 'API Endpoint Not Configured',
          description: `The '${resultsEndpointPath}' (GET) endpoint is not defined in API Docs. Cannot fetch results.`,
          variant: 'destructive',
          duration: 7000,
        });
        setResults(mockResults); // Fallback to mock data for UI
        setIsLoading(false);
        return;
      }
      
      const actualPath = fillPathParameters(resultsEndpoint.path, { run_id: currentRunId });
      toast({
        title: "Simulating Fetching Results",
        description: `Using endpoint: GET ${actualPath}`,
        variant: "default",
      });

      // Simulate fetching results
      setTimeout(() => {
        setResults(mockResults); // Replace with actual API call: fetch(actualPath)
        setIsLoading(false);
      }, 1500);
    };
    fetchResults();
  }, [toast]);

  const handleDownloadFile = (fileName: string) => {
    const downloadFileEndpointPath = `/download/:run_id/:filename`;
    const downloadEndpoint = getApiEndpoint(downloadFileEndpointPath, 'GET');

    if (!downloadEndpoint) {
      toast({
        title: 'API Endpoint Not Configured',
        description: `The '${downloadFileEndpointPath}' (GET) endpoint is not defined in API Docs.`,
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }

    const actualPath = fillPathParameters(downloadEndpoint.path, { run_id: currentRunId, filename: fileName });
    toast({
      title: `Simulating Download: ${fileName}`,
      description: `Using endpoint: GET ${actualPath}. Your download will start shortly.`,
      variant: "default",
    });
    // Actual download logic (e.g., window.location.href = actualPath) would go here
  };

  const handleDownloadAll = () => {
    const downloadZipEndpointPath = `/download/zip/:run_id`;
    const downloadZipEndpoint = getApiEndpoint(downloadZipEndpointPath, 'GET');

    if (!downloadZipEndpoint) {
      toast({
        title: 'API Endpoint Not Configured',
        description: `The '${downloadZipEndpointPath}' (GET) endpoint is not defined in API Docs.`,
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }
    
    setIsDownloadingAll(true);
    const actualPath = fillPathParameters(downloadZipEndpoint.path, { run_id: currentRunId });
    toast({
      title: "Simulating Zip Archive Preparation",
      description: `Using endpoint: GET ${actualPath}. This may take a moment...`,
      variant: "default",
    });

    setTimeout(() => {
      setIsDownloadingAll(false);
      toast({
        title: "Archive Downloaded (Simulated)",
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
        <CardDescription>Download your processed files. Uses endpoints from API Docs (e.g., /results/:run_id, /download/:run_id/:filename).</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="border-primary/30 bg-primary/5 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure 'GET' endpoints like '/results/:run_id', '/download/:run_id/:filename', and '/download/zip/:run_id' are defined in API Docs. Replace ':run_id', ':filename' with actual values on the API Docs page as path parameters.
            </AlertDescription>
        </Alert>
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
