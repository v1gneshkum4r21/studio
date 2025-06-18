
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, FileText, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ResultFile { 
  id: string; 
  name: string;
  type?: string; 
  path: string; // Backend provides path relative to run for download
}

// Corresponds to FastAPI's StatusResponse
interface BackendStatusResponse {
  run_id: string;
  status: string; // "queued", "processing", "completed", "failed"
  progress: number;
  current_stage: string;
  start_time: string; // ISO datetime string
  elapsed: string;
}

// Corresponds to FastAPI's ResultsResponse
interface BackendResultsResponse {
  run_id: string;
  status: string;
  completion_time?: string; // ISO datetime string
  templates: string[];
  vendor: string;
  outputs: Record<string, Record<string, string>>; // {template_filename: {file_type: output_filename_or_path}}
  metrics: Record<string, any>;
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints';
const FASTAPI_BASE_URL = 'http://localhost:8000';

const getApiEndpoint = (pathKey: string, method: 'GET' | 'POST' | 'DELETE'): ApiEndpoint | undefined => {
  try {
    const storedEndpoints = localStorage.getItem(API_ENDPOINTS_STORAGE_KEY);
    if (storedEndpoints) {
      const endpoints: ApiEndpoint[] = JSON.parse(storedEndpoints);
      // Find endpoint where pathKey starts with the defined path (to handle route params like /status/:run_id)
      return endpoints.find(ep => pathKey.startsWith(ep.path.split(':')[0].split('{')[0]) && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

const fillPathParameters = (pathWithParams: string, params: Record<string, string>): string => {
  let path = pathWithParams;
  for (const key in params) {
    path = path.replace(`:${key}`, params[key]).replace(`{${key}}`, params[key]);
  }
  return path;
};

interface ResultsSectionProps {
  runId: string | null;
}

export default function ResultsSection({ runId }: ResultsSectionProps) {
  const [resultsData, setResultsData] = useState<BackendResultsResponse | null>(null);
  const [displayedFiles, setDisplayedFiles] = useState<ResultFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [currentRunStatusMessage, setCurrentRunStatusMessage] = useState<string | null>(null);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const { toast } = useToast();

  const fetchRunStatus = useCallback(async (currentRunId: string): Promise<string | null> => {
    const statusEndpointConfig = getApiEndpoint('/status/:run_id', 'GET'); // Path key from API Docs
    if (!statusEndpointConfig) {
      setCurrentRunStatusMessage("Status endpoint '/status/:run_id' not configured in API Docs.");
      return 'config_error';
    }
    const actualPath = fillPathParameters(statusEndpointConfig.path, { run_id: currentRunId });
    
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to fetch status"}));
        throw new Error(error.detail);
      }
      const statusData: BackendStatusResponse = await response.json();
      setCurrentRunStatusMessage(`Status: ${statusData.status} - ${statusData.current_stage} (${statusData.progress}%)`);
      setCurrentProgress(statusData.progress);
      
      if (statusData.status === 'completed') return 'completed';
      if (statusData.status === 'failed') {
        toast({ title: "Processing Failed", description: `Run ${currentRunId} failed. Stage: ${statusData.current_stage}`, variant: "destructive" });
        return 'failed';
      }
      return statusData.status; // "processing", "queued"
    } catch (error: any) {
      setCurrentRunStatusMessage(`Error fetching status: ${error.message}`);
      // Don't toast every poll on error to avoid spam
      return 'error';
    }
  }, [toast]);


  const fetchResults = useCallback(async (currentRunId: string) => {
    setIsLoading(true);
    setCurrentRunStatusMessage("Fetching final results...");
    const resultsEndpointConfig = getApiEndpoint('/results/:run_id', 'GET');
    if (!resultsEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/results/:run_id' (GET) endpoint is not defined in API Docs. Cannot fetch results.",
        variant: 'destructive',
        duration: 7000,
      });
      setIsLoading(false);
      setCurrentRunStatusMessage(null);
      return;
    }
    const actualPath = fillPathParameters(resultsEndpointConfig.path, { run_id: currentRunId });

    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({detail: "Failed to fetch results."}));
        throw new Error(errorData.detail || `Failed to fetch results. Status: ${response.status}`);
      }
      const data: BackendResultsResponse = await response.json();
      setResultsData(data);

      const files: ResultFile[] = [];
      if (data.outputs) {
        // FastAPI outputs: {template_filename: {file_type: output_filename_or_path_relative_to_run}}
        Object.entries(data.outputs).forEach(([templateName, fileTypeMap]) => {
          Object.entries(fileTypeMap).forEach(([fileType, backendFilePath]) => {
            // backendFilePath is like "/runs/{run_id}/{template_name}_{file_type}_{timestamp}.json"
            // We need just the filename for download
            const filename = backendFilePath.substring(backendFilePath.lastIndexOf('/') + 1);
            files.push({
              id: `${currentRunId}_${templateName}_${fileType}_${filename}`, // Unique ID for UI
              name: filename, 
              path: filename, // The filename is what /download/:run_id/:filename expects
              type: fileType.toUpperCase(),
            });
          });
        });
      }
      setDisplayedFiles(files);
      setCurrentRunStatusMessage(data.status === 'completed' ? "Results loaded successfully." : `Status: ${data.status}`);
      if (data.status === 'completed') {
        toast({ title: "Results Loaded", description: `Results for run ${currentRunId} fetched.`, variant: "default" });
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Error Fetching Results',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
      setResultsData(null);
      setDisplayedFiles([]);
      setCurrentRunStatusMessage("Failed to load results.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

 useEffect(() => {
    let pollTimeout: NodeJS.Timeout;
    if (runId) {
      setIsLoading(true);
      setResultsData(null);
      setDisplayedFiles([]);
      setCurrentRunStatusMessage("Processing initiated...");
      setCurrentProgress(0);

      const pollStatus = async () => {
        const statusResult = await fetchRunStatus(runId);
        if (statusResult === 'completed') {
          fetchResults(runId); 
          return; 
        }
        if (statusResult === 'failed' || statusResult === 'error' || statusResult === 'config_error') {
          setIsLoading(false); 
          if (statusResult !== 'error' && statusResult !== 'config_error') { // Don't toast for intermittent poll errors
            setCurrentRunStatusMessage(prev => prev || "Run failed or encountered an error.");
          }
          return; 
        }
        // If still processing or queued, poll again
        if (runId) { 
            pollTimeout = setTimeout(pollStatus, 3000); 
        }
      };
      pollStatus();
      
      return () => clearTimeout(pollTimeout); // Cleanup timeout on unmount or runId change
    } else {
      setResultsData(null);
      setDisplayedFiles([]);
      setIsLoading(false);
      setCurrentRunStatusMessage(null);
      setCurrentProgress(0);
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
    // FastAPI path: /download/{run_id}/{filename}
    const actualPath = fillPathParameters(downloadFileEndpointConfig.path, { run_id: runId, filename: fileNameToDownload });
    
    try {
      toast({ title: `Preparing Download: ${fileNameToDownload}`, variant: "default" });
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: `Failed to download ${fileNameToDownload}`}));
        throw new Error(errorData.detail || `Download failed for ${fileNameToDownload}. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNameToDownload; // The actual filename from path
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${fileNameToDownload} is downloading.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
       console.error('Download error:', error);
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
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
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
      console.error('Zip download error:', error);
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
         {(isLoading || (currentProgress > 0 && currentProgress < 100)) && <div className="flex items-center text-sm text-muted-foreground mt-2"><Loader2 className="h-4 w-4 animate-spin mr-2" /> {currentRunStatusMessage || "Loading..."}</div>}
         {!isLoading && currentRunStatusMessage && (!currentRunStatusMessage.includes("Processing") && !currentRunStatusMessage.includes("queued")) && <div className="text-sm text-muted-foreground mt-2">{currentRunStatusMessage}</div>}
         {currentProgress > 0 && isLoading && ( // Show progress bar only while loading and progress is happening
            <Progress value={currentProgress} className="w-full h-2.5 mt-2" />
         )}
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="border-primary/30 bg-primary/5 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure 'GET' endpoints like '/results/:run_id', '/status/:run_id', '/download/:run_id/:filename', and '/download/zip/:run_id' are defined in API Docs.
            </AlertDescription>
        </Alert>
        {isLoading && !resultsData && currentProgress < 100 && (
             <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading results for {runId}...</p>
            </div>
        )}
        {!isLoading && resultsData && resultsData.status === 'completed' && displayedFiles.length === 0 && (
          <p className="text-muted-foreground text-center py-4">No output files found for this run, though it completed.</p>
        )}
        {!isLoading && resultsData && resultsData.status !== 'completed' && !currentRunStatusMessage?.includes("Processing") && !currentRunStatusMessage?.includes("queued") && (
            <p className="text-muted-foreground text-center py-4">Run {runId} status: {resultsData?.status || currentRunStatusMessage || "Unknown"}. Results will appear once completed.</p>
        )}
         {!isLoading && !resultsData && currentRunStatusMessage && (currentRunStatusMessage.includes("failed") || currentRunStatusMessage.includes("Error")) && (
             <p className="text-destructive text-center py-4">{currentRunStatusMessage}</p>
         )}


        {displayedFiles.length > 0 && resultsData && resultsData.status === 'completed' && (
          <div className="space-y-3">
            {displayedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-md shadow-sm hover:shadow-md transition-shadow bg-card">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-[300px]" title={file.name}>{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.type}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(file.path)} aria-label={`Download ${file.name}`}>
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
            {resultsData.metrics && Object.keys(resultsData.metrics).length > 0 && (
                <div className="mt-4 p-3 border rounded-md bg-secondary/30">
                    <h4 className="font-semibold mb-2 text-md">Processing Metrics:</h4>
                    <ul className="text-xs space-y-1">
                    {Object.entries(resultsData.metrics).map(([key, value]) => (
                        <li key={key}><strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {typeof value === 'number' ? value.toLocaleString() : String(value)}</li>
                    ))}
                    </ul>
                </div>
            )}
          </div>
        )}
         <Button variant="outline" size="sm" onClick={() => runId && (fetchRunStatus(runId).then(status => status === 'completed' && fetchResults(runId)))} disabled={isLoading || !runId} className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Status / Results
        </Button>
      </CardContent>
    </Card>
  );
}
