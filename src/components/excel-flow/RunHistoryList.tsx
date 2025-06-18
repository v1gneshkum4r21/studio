
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, HistoryIcon, Loader2, AlertTriangle, RefreshCw, FileText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Frontend representation of a file within an archived run
interface RunOutputFile {
  id: string; // e.g., templateName_fileType_filename
  name: string; // filename for display and download
  type: string; // e.g., "layout_json", "filled_excel"
  path: string; // filename as expected by /download/:run_id/:filename backend endpoint
}

// Frontend representation of an archived run
interface ArchivedRun {
  id: string; // run_id
  runName: string; // User-defined or derived (e.g. "Run <run_id>")
  executionDate: string; // ISO string (completion_time or start_time)
  status: 'Completed' | 'Failed' | 'Processing' | 'Queued' | 'Unknown';
  files: RunOutputFile[];
  templateFileCount: number;
  vendorFileCount: number; // FastAPI's ProcessRequest uses single vendor, so this is usually 1
  metrics?: Record<string, any>; // Metrics from FastAPI ResultsResponse
}

// Structure expected from FastAPI for each item in the /history/list response
// This needs to be implemented in the FastAPI backend.
interface BackendHistoryItem {
  run_id: string;
  status: string; // "completed", "failed", "processing", "queued"
  completion_time?: string; // ISO datetime string
  start_time: string; // ISO datetime string (from StatusResponse part of processing_runs)
  templates: string[]; // List of template filenames/IDs used
  vendor: string; // Vendor filename/ID used
  outputs?: Record<string, Record<string, string>>; // {template_filename: {file_type: output_filename_or_path}}
  metrics?: Record<string, any>;
  // Potentially add run_name if backend stores it
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
      return endpoints.find(ep => (pathKey.startsWith(ep.path.split(':')[0].split('{')[0])) && ep.method === method);
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

export default function RunHistoryList() {
  const [archivedRuns, setArchivedRuns] = useState<ArchivedRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchArchivedRuns = useCallback(async () => {
    setIsLoading(true);
    const listRunsEndpointConfig = getApiEndpoint('/history/list', 'GET'); 

    if (!listRunsEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured for History',
        description: "The '/history/list' (GET) endpoint for listing run history is not defined in API Docs. Please configure it and ensure it's implemented in your FastAPI backend.",
        variant: 'destructive',
        duration: 10000,
      });
      setArchivedRuns([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${listRunsEndpointConfig.path}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to fetch run history." }));
         if (response.status === 404) {
             throw new Error("'/history/list' endpoint not found on server. Please implement it in FastAPI to return a list of past run details.");
         }
        throw new Error(errorData.detail || `Failed to fetch history. Status: ${response.status}`);
      }
      
      const data: BackendHistoryItem[] = await response.json(); 
      
      const mappedRuns: ArchivedRun[] = data.map((run: BackendHistoryItem) => {
        const files: RunOutputFile[] = [];
        if (run.outputs) {
            Object.entries(run.outputs).forEach(([templateName, fileTypeMap]) => {
                Object.entries(fileTypeMap).forEach(([fileType, backendFilePath]) => {
                    const filename = backendFilePath.substring(backendFilePath.lastIndexOf('/') + 1);
                    files.push({ 
                        id: `${run.run_id}_${templateName}_${fileType}_${filename}`, 
                        name: filename,
                        path: filename, // Path is just the filename for download endpoint
                        type: fileType.toUpperCase()
                    });
                });
            });
        }
        
        let runStatus: ArchivedRun['status'] = 'Unknown';
        if (run.status === 'completed') runStatus = 'Completed';
        else if (run.status === 'failed') runStatus = 'Failed';
        else if (run.status === 'processing') runStatus = 'Processing';
        else if (run.status === 'queued') runStatus = 'Queued';

        return {
          id: run.run_id,
          runName: `Run ${run.run_id.substring(0,8)}...`, // Use a portion of run_id as name if not provided
          executionDate: run.completion_time || run.start_time,
          status: runStatus,
          files: files,
          templateFileCount: run.templates?.length || 0,
          vendorFileCount: run.vendor ? 1 : 0, // FastAPI takes one vendor
          metrics: run.metrics
        };
      }).sort((a,b) => parseISO(b.executionDate).getTime() - parseISO(a.executionDate).getTime()); 
      
      setArchivedRuns(mappedRuns);
      if (mappedRuns.length > 0) {
        toast({title: "Run History Loaded", description: `${mappedRuns.length} past runs fetched.`, variant: "default"});
      } else if (data.length === 0) {
        toast({title: "No Run History", description: "No past runs found on the server.", variant: "default"});
      }

    } catch (error: any) {
      console.error("Error fetching run history:", error);
      toast({
        title: 'Error Fetching Run History',
        description: error.message || 'An unexpected error occurred. Ensure /history/list endpoint is implemented in FastAPI.',
        variant: 'destructive',
        duration: 10000,
      });
      setArchivedRuns([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchArchivedRuns();
  }, [fetchArchivedRuns]);

  const handleDownloadFile = async (runId: string, runName: string, fileName: string) => {
    const downloadFileEndpointConfig = getApiEndpoint('/download/:run_id/:filename', 'GET');
    if (!downloadFileEndpointConfig) {
      toast({ title: 'API Endpoint Not Configured', description: "The '/download/:run_id/:filename' (GET) endpoint is not defined.", variant: 'destructive' });
      return;
    }
    const actualPath = fillPathParameters(downloadFileEndpointConfig.path, { run_id: runId, filename: fileName });
    try {
      toast({ title: `Preparing Download: ${fileName}`, variant: "default" });
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: `Failed to download ${fileName}`}));
        throw new Error(errorData.detail || `Download failed for ${fileName}. Status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Download Started", description: `${fileName} from run ${runName} is downloading.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({ title: "Download Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleDownloadRunArchive = async (runId: string, runName: string) => {
    const downloadZipEndpointConfig = getApiEndpoint('/download/zip/:run_id', 'GET');
    if (!downloadZipEndpointConfig) {
      toast({ title: 'API Endpoint Not Configured', description: "The '/download/zip/:run_id' (GET) endpoint is not defined.", variant: 'destructive' });
      return;
    }
    const actualPath = fillPathParameters(downloadZipEndpointConfig.path, { run_id: runId });
    try {
      toast({ title: `Preparing Archive for ${runName}`, variant: "default" });
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: "Failed to download zip archive"}));
        throw new Error(errorData.detail || `Zip download failed for ${runName}. Status: ${response.status}`);
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
      toast({ title: "Archive Download Started", description: `Archive for ${runName} is downloading.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      console.error('Archive download error:', error);
      toast({ title: "Archive Download Failed", description: error.message, variant: "destructive" });
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <HistoryIcon className="mr-2 h-6 w-6 text-primary" /> Archived Runs
        </CardTitle>
        <CardDescription>Review details and download files. Ensure FastAPI server (with CORS) and API Docs are configured. The '/history/list' endpoint needs to be implemented in FastAPI.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="border-primary/30 bg-primary/5 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold text-primary">Backend Endpoint Required</AlertTitle>
            <AlertDescription className="text-primary/90 text-xs">
                This page requires a 'GET' endpoint like '/history/list' in your FastAPI backend to list past runs.
                This endpoint is currently **not implemented** in the provided FastAPI code.
                Download endpoints ('/download/:run_id/:filename', '/download/zip/:run_id') also need API Docs configuration.
            </AlertDescription>
        </Alert>
        {isLoading ? (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading history...</p>
            </div>
        ) : archivedRuns.length === 0 ? (
           <p className="text-muted-foreground text-center py-4">No run history available. Ensure the '/history/list' endpoint is implemented in FastAPI and returns data.</p>
        ) : (
        <Accordion type="single" collapsible className="w-full">
          {archivedRuns.map((run) => (
            <AccordionItem value={run.id} key={run.id} className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex justify-between items-center w-full pr-4">
                  <div className="text-left">
                    <h3 className="font-semibold text-md text-primary">{run.runName}</h3>
                    <p className="text-xs text-muted-foreground">
                      ID: <span className="font-code">{run.id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Executed: {format(parseISO(run.executionDate), "PPp")}
                    </p>
                  </div>
                  <Badge 
                    variant={run.status === 'Completed' ? 'default' : run.status === 'Failed' ? 'destructive' : 'secondary'}
                    className={run.status === 'Completed' ? 'bg-accent text-accent-foreground' : ''}
                  >
                    {run.status}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4 px-2 bg-secondary/20 rounded-b-md">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <p><span className="font-medium">Templates:</span> {run.templateFileCount}</p>
                    <p><span className="font-medium">Vendor Files:</span> {run.vendorFileCount}</p>
                  </div>
                  <h4 className="font-medium text-sm pt-2">Output Files ({run.files.length}):</h4>
                  {run.files.length > 0 ? (
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {run.files.map((file) => (
                        <li key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-background shadow-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs truncate" title={file.name}>{file.name} ({file.type})</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(run.id, run.runName, file.path)} aria-label={`Download ${file.name}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No output files recorded for this run.</p>
                  )}
                   {run.metrics && Object.keys(run.metrics).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <h5 className="font-medium text-xs mb-1">Metrics:</h5>
                        <pre className="text-xs p-2 border rounded-md bg-background/50 overflow-x-auto max-h-40">
                            {JSON.stringify(run.metrics, null, 2)}
                        </pre>
                    </div>
                  )}
                  {(run.status === 'Completed' && run.files.length > 0) && (
                    <Button onClick={() => handleDownloadRunArchive(run.id, run.runName)} size="sm" className="w-full mt-2">
                        <FileArchive className="mr-2 h-4 w-4" /> Download Full Archive for this Run
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        )}
        <Button variant="outline" size="sm" onClick={fetchArchivedRuns} disabled={isLoading} className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh Run History
        </Button>
      </CardContent>
    </Card>
  );
}
