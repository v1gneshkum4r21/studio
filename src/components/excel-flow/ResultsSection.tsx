
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, FileText, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Progress } from "@/components/ui/progress"; // Only if using progress bar

interface ResultFile { // Represents a file listed in the results
  id: string; // Could be filename or a unique ID if backend provides
  name: string;
  type?: string; // e.g. 'Excel', 'JSON', 'Log' - derived from filename or backend
  path?: string; // Full path/identifier for download if different from name
}

interface ResultsData { // Structure matching FastAPI's ResultsResponse (simplified)
  status: string;
  completion_time?: string;
  outputs: Record<string, Record<string, string>>; // {template: {file_type: path_or_filename}}
  metrics?: Record<string, any>;
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
      return endpoints.find(ep => (ep.path === pathKey || pathKey.startsWith(ep.path.split(':')[0])) && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

const fillPathParameters = (pathWithParams: string, params: Record<string, string>): string => {
  let path = pathWithParams;
  for (const key in params) {
    path = path.replace(`:${key}`, params[key]);
  }
  return path;
};

interface ResultsSectionProps {
  runId: string | null;
}

export default function ResultsSection({ runId }: ResultsSectionProps) {
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [displayedFiles, setDisplayedFiles] = useState<ResultFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [currentRunStatus, setCurrentRunStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0); // For polling status
  const { toast } = useToast();

  const fetchRunStatus = useCallback(async (currentRunId: string) => {
    const statusEndpointConfig = getApiEndpoint('/status/:run_id', 'GET');
    if (!statusEndpointConfig) {
      // Don't toast every poll, just set status
      setCurrentRunStatus("Status endpoint not configured");
      return;
    }
    const actualPath = fillPathParameters(statusEndpointConfig.path, { run_id: currentRunId });
    try {
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to fetch status"}));
        throw new Error(error.detail);
      }
      const statusData = await response.json();
      setCurrentRunStatus(`${statusData.current_stage} (${statusData.progress}%)`);
      setProgress(statusData.progress);
      if (statusData.status === 'completed') {
        return 'completed';
      }
      if (statusData.status === 'failed') {
        toast({ title: "Processing Failed", description: `Run ${currentRunId} failed. Check logs.`, variant: "destructive" });
        return 'failed';
      }
    } catch (error: any) {
      setCurrentRunStatus("Error fetching status");
      // Don't toast every poll on error
    }
    return null; // Still processing or error
  }, [toast]);


  const fetchResults = useCallback(async (currentRunId: string) => {
    setIsLoading(true);
    setCurrentRunStatus("Fetching results...");
    const resultsEndpointConfig = getApiEndpoint('/results/:run_id', 'GET');
    if (!resultsEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/results/:run_id' (GET) endpoint is not defined in API Docs. Cannot fetch results.",
        variant: 'destructive',
        duration: 7000,
      });
      setIsLoading(false);
      setCurrentRunStatus(null);
      return;
    }
    const actualPath = fillPathParameters(resultsEndpointConfig.path, { run_id: currentRunId });

    try {
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({detail: "Failed to fetch results."}));
        throw new Error(errorData.detail || `Failed to fetch results. Status: ${response.status}`);
      }
      const data: ResultsData = await response.json();
      setResultsData(data);

      const files: ResultFile[] = [];
      if (data.outputs) {
        Object.entries(data.outputs).forEach(([templateName, fileTypes]) => {
          Object.entries(fileTypes).forEach(([fileType, filePathOrName]) => {
            // Assuming filePathOrName is the actual filename for download
            const fileName = filePathOrName.substring(filePathOrName.lastIndexOf('/') + 1);
            files.push({
              id: `${templateName}_${fileType}_${fileName}`,
              name: fileName, // Display name
              path: fileName, // Used for download function
              type: fileType,
            });
          });
        });
      }
      setDisplayedFiles(files);
      setCurrentRunStatus("Results loaded.");
      toast({ title: "Results Loaded", description: `Results for run ${currentRunId} fetched successfully.`, variant: "default" });
    } catch (error: any) {
      toast({
        title: 'Error Fetching Results',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setResultsData(null);
      setDisplayedFiles([]);
      setCurrentRunStatus("Failed to load results.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

 useEffect(() => {
    if (runId) {
      setIsLoading(true);
      setResultsData(null);
      setDisplayedFiles([]);
      setCurrentRunStatus("Processing started...");
      setProgress(0);

      const pollStatus = async () => {
        const status = await fetchRunStatus(runId);
        if (status === 'completed') {
          fetchResults(runId); // Fetch final results
          return; // Stop polling
        }
        if (status === 'failed') {
          setIsLoading(false); // Stop loading indicator
          return; // Stop polling
        }
        // If still processing, poll again
        if (runId) { // Check runId again because it might change
            setTimeout(pollStatus, 3000); // Poll every 3 seconds
        }
      };
      pollStatus();
    } else {
      setResultsData(null);
      setDisplayedFiles([]);
      setIsLoading(false);
      setCurrentRunStatus(null);
      setProgress(0);
    }
  }, [runId, fetchRunStatus, fetchResults]);


  const handleDownloadFile = async (fileNameToDownload: string) => {
    if (!runId) return;
    const downloadFileEndpointConfig = getApiEndpoint('/download/:run_id/:filename', 'GET');
    if (!downloadFileEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/download/:run_id/:filename' (GET) endpoint is not defined in API Docs.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }
    const actualPath = fillPathParameters(downloadFileEndpointConfig.path, { run_id: runId, filename: fileNameToDownload });
    
    try {
      toast({ title: `Preparing Download: ${fileNameToDownload}`, variant: "default" });
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: `Failed to download ${fileNameToDownload}`}));
        throw new Error(errorData.detail || `Download failed. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameToDownload;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${fileNameToDownload} is downloading.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
       toast({ title: "Download Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadAll = async () => {
    if (!runId) return;
    const downloadZipEndpointConfig = getApiEndpoint('/download/zip/:run_id', 'GET');
    if (!downloadZipEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/download/zip/:run_id' (GET) endpoint is not defined in API Docs.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }
    
    setIsDownloadingAll(true);
    const actualPath = fillPathParameters(downloadZipEndpointConfig.path, { run_id: runId });
    try {
      toast({ title: "Preparing Zip Archive", description: "This may take a moment...", variant: "default" });
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: "Failed to download zip archive"}));
        throw new Error(errorData.detail || `Zip download failed. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onboarding_results_${runId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Archive Download Started", description: `onboarding_results_${runId}.zip is downloading.`, className: "bg-accent text-accent-foreground"});
    } catch (error: any) {
      toast({ title: "Archive Download Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDownloadingAll(false);
    }
  };


  if (!runId) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <FileArchive className="mr-2 h-6 w-6 text-primary" /> Results &amp; Output
          </CardTitle>
          <CardDescription>Execute a pipeline to see results here. Ensure API endpoints and CORS are configured.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">No pipeline run active or selected.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <FileArchive className="mr-2 h-6 w-6 text-primary" /> Results for Run: <span className="ml-2 font-code text-lg truncate">{runId}</span>
        </CardTitle>
        <CardDescription>Download processed files. API endpoints from API Docs. Ensure FastAPI server is running with CORS.</CardDescription>
         {isLoading && <div className="flex items-center text-sm text-muted-foreground mt-2"><Loader2 className="h-4 w-4 animate-spin mr-2" /> {currentRunStatus || "Loading..."}</div>}
         {!isLoading && currentRunStatus && <div className="text-sm text-muted-foreground mt-2">{currentRunStatus}</div>}
         {progress > 0 && progress < 100 && isLoading && (
            <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
         )}
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="border-primary/30 bg-primary/5 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure 'GET' endpoints like '/results/:run_id', '/status/:run_id', '/download/:run_id/:filename', and '/download/zip/:run_id' are defined in API Docs.
            </AlertDescription>
        </Alert>
        {isLoading && !resultsData && (
             <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading results for {runId}...</p>
            </div>
        )}
        {!isLoading && resultsData && resultsData.status === 'completed' && displayedFiles.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No output files found for this run, though it completed.</p>
        )}
        {!isLoading && resultsData && resultsData.status !== 'completed' && !currentRunStatus?.includes("Processing") && (
            <p className="text-muted-foreground text-center py-4">Run {runId} status: {resultsData?.status || currentRunStatus || "Unknown"}. Results will appear once completed.</p>
        )}

        {displayedFiles.length > 0 && resultsData && resultsData.status === 'completed' && (
          <div className="space-y-3">
            {displayedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-card">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(file.path || file.name)} aria-label={`Download ${file.name}`}>
                  <Download className="h-5 w-5" />
                </Button>
              </div>
            ))}
            <Button onClick={handleDownloadAll} disabled={isDownloadingAll || isLoading} className="w-full mt-4">
              {isDownloadingAll ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isDownloadingAll ? 'Preparing Archive...' : 'Download All as Zip'}
            </Button>
            {resultsData.metrics && (
                <div className="mt-4 p-3 border rounded-md bg-secondary/30">
                    <h4 className="font-semibold mb-2">Processing Metrics:</h4>
                    <ul className="text-xs space-y-1">
                    {Object.entries(resultsData.metrics).map(([key, value]) => (
                        <li key={key}><strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {typeof value === 'number' ? value.toLocaleString() : value}</li>
                    ))}
                    </ul>
                </div>
            )}
          </div>
        )}
         <Button variant="outline" size="sm" onClick={() => runId && fetchRunStatus(runId)} disabled={isLoading || !runId} className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status / Results
        </Button>
      </CardContent>
    </Card>
  );
}
