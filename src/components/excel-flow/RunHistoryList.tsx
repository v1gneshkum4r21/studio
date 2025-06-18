
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, HistoryIcon, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns'; // For parsing ISO strings from backend
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RunFile { // From FastAPI ResultsResponse -> outputs
  id: string; // e.g. templateName_fileType_filename
  name: string; // filename
  // size: string; // Not directly available from FastAPI outputs, might need backend change
}

interface ArchivedRun { // Derived from FastAPI ResultsResponse and StatusResponse
  id: string; // run_id
  runName: string; // Not directly in FastAPI run data, maybe use run_id or a fixed name
  executionDate: string; // completion_time from results or start_time from status
  status: 'Completed' | 'Failed' | 'In Progress' | 'Queued' | 'Unknown';
  files: RunFile[];
  templateFileCount: number; // From results.templates.length
  vendorFileCount: number; // results.vendor (is string, so 1 if present)
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

export default function RunHistoryList() {
  const [archivedRuns, setArchivedRuns] = useState<ArchivedRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchArchivedRuns = useCallback(async () => {
    setIsLoading(true);
    const listRunsEndpointConfig = getApiEndpoint('/history/list', 'GET'); // User needs to implement this in FastAPI

    if (!listRunsEndpointConfig) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/history/list' (GET) endpoint for listing run history is not defined in API Docs. Cannot fetch history. Please implement this endpoint in your FastAPI backend to return a list of run objects (e.g., from `processing_runs` or `run_results` keys).",
        variant: 'destructive',
        duration: 10000,
      });
      setArchivedRuns([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000${listRunsEndpointConfig.path}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to fetch run history." }));
         if (response.status === 404) {
             throw new Error("'/history/list' endpoint not found on server. Please implement it in FastAPI.");
         }
        throw new Error(errorData.detail || `Failed to fetch history. Status: ${response.status}`);
      }
      // Assuming backend returns a list of objects, each representing a run.
      // The structure of these objects needs to match what can be mapped to ArchivedRun.
      // For now, let's assume it's a list of full ResultsResponse objects or similar.
      const data: any[] = await response.json(); 
      
      // Map backend data to frontend ArchivedRun structure
      const mappedRuns: ArchivedRun[] = data.map((run: any) => {
        const files: RunFile[] = [];
        if (run.outputs) {
            Object.entries(run.outputs).forEach(([templateName, fileTypes]: [string, any]) => {
                Object.entries(fileTypes).forEach(([fileType, filePathOrName]: [string, any]) => {
                    const fileName = (filePathOrName as string).substring((filePathOrName as string).lastIndexOf('/') + 1);
                    files.push({ id: `${templateName}_${fileType}_${fileName}`, name: fileName });
                });
            });
        }
        return {
          id: run.run_id || run.id, // Prefer run_id if available
          runName: run.runName || `Run ${run.run_id || run.id}`, // Placeholder if no runName
          executionDate: run.completion_time || run.start_time || new Date().toISOString(),
          status: run.status === 'completed' ? 'Completed' : run.status === 'failed' ? 'Failed' : run.status === 'processing' ? 'In Progress' : run.status === 'queued' ? 'Queued' : 'Unknown',
          files: files,
          templateFileCount: run.templates?.length || 0,
          vendorFileCount: run.vendor ? 1 : 0,
        };
      }).sort((a,b) => parseISO(b.executionDate).getTime() - parseISO(a.executionDate).getTime()); // Sort by date descending
      
      setArchivedRuns(mappedRuns);
      if (mappedRuns.length > 0) {
        toast({title: "Run History Loaded", description: `${mappedRuns.length} runs fetched.`, variant: "default"});
      }

    } catch (error: any) {
      toast({
        title: 'Error Fetching Run History',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
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
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) throw new Error(`Failed to download ${fileName}. Status: ${response.status}`);
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
      const response = await fetch(`http://localhost:8000${actualPath}`);
      if (!response.ok) throw new Error(`Failed to download archive for ${runName}. Status: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onboarding_results_${runId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Archive Download Started", description: `${runName}_archive.zip is downloading.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
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
            <AlertDescription className="text-primary/90 text-xs">
                Requires a 'GET' endpoint like '/history/list' in FastAPI to list runs. Download endpoints ('/download/:run_id/:filename', '/download/zip/:run_id') also need API Docs config.
            </AlertDescription>
        </Alert>
        {isLoading ? (
            <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading history...</p>
            </div>
        ) : archivedRuns.length === 0 ? (
           <p className="text-muted-foreground text-center py-4">No run history available or '/history/list' endpoint needs implementation/data.</p>
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
                    <p><span className="font-medium">Template Files Processed:</span> {run.templateFileCount}</p>
                    <p><span className="font-medium">Vendor Files Processed:</span> {run.vendorFileCount}</p>
                  </div>
                  <h4 className="font-medium text-sm pt-2">Output Files:</h4>
                  {run.files.length > 0 ? (
                    <ul className="space-y-2">
                      {run.files.map((file) => (
                        <li key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-background shadow-sm">
                          <span className="text-xs truncate" title={file.name}>{file.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(run.id, run.runName, file.name)} aria-label={`Download ${file.name}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No output files for this run.</p>
                  )}
                  {run.status === 'Completed' && (
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
