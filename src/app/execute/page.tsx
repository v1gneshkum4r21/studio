
'use client';

import type { ChangeEvent } from 'react';
import { useState, useEffect, useCallback }
from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
import { Workflow, PlayCircle, Settings2, Loader2, FileText, Download, RefreshCw, FileArchive, AlertTriangle, Server, ListChecks } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Interfaces from FastAPI backend
interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints';
const FASTAPI_BASE_URL = 'http://localhost:8000'; // Ensure this matches your FastAPI server

const getApiEndpoint = (pathKey: string, method: 'GET' | 'POST' | 'DELETE'): ApiEndpoint | undefined => {
  try {
    const storedEndpoints = localStorage.getItem(API_ENDPOINTS_STORAGE_KEY);
    if (storedEndpoints) {
      const endpoints: ApiEndpoint[] = JSON.parse(storedEndpoints);
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

interface BackendStatusResponse {
  run_id: string;
  status: string;
  progress: number;
  current_stage: string;
  start_time: string;
  elapsed: string;
}

interface BackendResultsResponse {
  run_id: string;
  status: string;
  completion_time?: string;
  templates: string[];
  vendor: string;
  outputs: Record<string, Record<string, string>>;
  metrics: Record<string, any>;
}

interface OutputFile {
  id: string;
  name: string;
  path: string; // Backend provides path relative to run for download (just filename for /download/:run_id/:filename)
  type: string; // e.g., "filled_excel", "layout_json"
  templateOrigin: string; // Original template filename this output belongs to
}


export default function ExecutePipelinePage() {
  const { toast } = useToast();

  const [availableTemplateFiles, setAvailableTemplateFiles] = useState<string[]>([]);
  const [availableVendorFiles, setAvailableVendorFiles] = useState<string[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [runName, setRunName] = useState<string>('');
  // const [advancedOption1, setAdvancedOption1] = useState<boolean>(false); // Example
  // const [advancedOption2, setAdvancedOption2] = useState<boolean>(false); // Example

  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [runStatusInfo, setRunStatusInfo] = useState<BackendStatusResponse | null>(null);
  const [runResultsInfo, setRunResultsInfo] = useState<BackendResultsResponse | null>(null);
  const [displayedOutputFiles, setDisplayedOutputFiles] = useState<OutputFile[]>([]);
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);


  const fetchAvailableFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    const listTemplatesEndpoint = getApiEndpoint('/template/list', 'GET');
    const listVendorsEndpoint = getApiEndpoint('/vendor/list', 'GET');

    if (!listTemplatesEndpoint || !listVendorsEndpoint) {
      toast({ title: "API Config Error", description: "Please define '/template/list' and '/vendor/list' (GET) endpoints in API Docs.", variant: "destructive" });
      setIsLoadingFiles(false);
      return;
    }

    try {
      const [templatesRes, vendorsRes] = await Promise.all([
        fetch(`${FASTAPI_BASE_URL}${listTemplatesEndpoint.path}`),
        fetch(`${FASTAPI_BASE_URL}${listVendorsEndpoint.path}`)
      ]);

      if (!templatesRes.ok) throw new Error(`Failed to fetch templates: ${templatesRes.statusText}`);
      const templatesData = await templatesRes.json(); // Expects { "templates": ["file1.xlsx", ...] }
      setAvailableTemplateFiles(templatesData.templates || []);

      if (!vendorsRes.ok) throw new Error(`Failed to fetch vendor files: ${vendorsRes.statusText}`);
      const vendorsData = await vendorsRes.json(); // Expects { "vendors": ["vendor.xlsx", ...] }
      setAvailableVendorFiles(vendorsData.vendors || []);

      if ((templatesData.templates || []).length === 0) {
        toast({ title: "No Templates Found", description: "Please upload template files on the Processing page.", variant: "default" });
      }
      if ((vendorsData.vendors || []).length === 0) {
        toast({ title: "No Vendor Files Found", description: "Please upload a vendor file on the Processing page.", variant: "default" });
      }

    } catch (error: any) {
      toast({ title: "Error Fetching Files", description: error.message, variant: "destructive" });
      setAvailableTemplateFiles([]);
      setAvailableVendorFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAvailableFiles();
  }, [fetchAvailableFiles]);

  const handleTemplateSelectionChange = (fileId: string) => {
    setSelectedTemplateIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleExecutePipeline = async () => {
    if (selectedTemplateIds.length === 0 || !selectedVendorId) {
      toast({ title: "Selection Incomplete", description: "Please select at least one template and one vendor file.", variant: "destructive" });
      return;
    }
    const processApiEndpoint = getApiEndpoint('/process', 'POST');
    if (!processApiEndpoint) {
      toast({ title: "API Config Error", description: "Define '/process' (POST) endpoint in API Docs.", variant: "destructive" });
      return;
    }

    setIsExecuting(true);
    setCurrentRunId(null);
    setRunStatusInfo(null);
    setRunResultsInfo(null);
    setDisplayedOutputFiles([]);

    const requestBody = {
      templates: selectedTemplateIds,
      vendor: selectedVendorId,
      // run_name: runName, // If backend supports
      // advanced_options: { strict_schema_validation: advancedOption1, generate_detailed_log: advancedOption2 } // If backend supports
    };

    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${processApiEndpoint.path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Pipeline execution failed." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const result = await response.json(); // Expects { "run_id": "...", "status": "queued", ... }
      setCurrentRunId(result.run_id);
      toast({ title: "Pipeline Queued", description: `Run ID: ${result.run_id}. Status: ${result.status}.`, variant: "default", className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      toast({ title: "Pipeline Execution Failed", description: error.message, variant: "destructive" });
      setIsExecuting(false);
    }
    // Polling will start via useEffect watching currentRunId
  };

  const fetchRunStatus = useCallback(async (activeRunId: string): Promise<string | null> => {
    const statusEndpointConfig = getApiEndpoint('/status/:run_id', 'GET');
    if (!statusEndpointConfig) {
      setRunStatusInfo(prev => ({ ...prev, status: "config_error", current_stage: "Status endpoint not configured."} as BackendStatusResponse));
      return 'config_error';
    }
    const actualPath = fillPathParameters(statusEndpointConfig.path, { run_id: activeRunId });
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Failed to fetch status" }));
        throw new Error(error.detail);
      }
      const statusData: BackendStatusResponse = await response.json();
      setRunStatusInfo(statusData);
      if (statusData.status === 'completed') return 'completed';
      if (statusData.status === 'failed') {
        toast({ title: "Processing Failed", description: `Run ${activeRunId} failed. Stage: ${statusData.current_stage}`, variant: "destructive" });
        return 'failed';
      }
      return statusData.status;
    } catch (error: any) {
      setRunStatusInfo(prev => ({ ...prev, status: "error", current_stage: `Error fetching status: ${error.message}` } as BackendStatusResponse));
      return 'error';
    }
  }, [toast]);

  const fetchFinalResults = useCallback(async (completedRunId: string) => {
    setIsExecuting(true); // Keep loading state for results fetch
    const resultsEndpointConfig = getApiEndpoint('/results/:run_id', 'GET');
    if (!resultsEndpointConfig) {
      toast({ title: "API Config Error", description: "Define '/results/:run_id' (GET) endpoint in API Docs.", variant: "destructive" });
      setIsExecuting(false);
      return;
    }
    const actualPath = fillPathParameters(resultsEndpointConfig.path, { run_id: completedRunId });
    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Failed to fetch results." }));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const data: BackendResultsResponse = await response.json();
      setRunResultsInfo(data);

      const files: OutputFile[] = [];
      if (data.outputs) {
        Object.entries(data.outputs).forEach(([templateOrigin, fileTypeMap]) => {
          Object.entries(fileTypeMap).forEach(([fileType, backendFilePath]) => {
            const filename = backendFilePath.substring(backendFilePath.lastIndexOf('/') + 1);
            files.push({
              id: `${completedRunId}_${templateOrigin}_${fileType}_${filename}`,
              name: filename,
              path: filename, // Filename for download endpoint
              type: fileType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Make it readable
              templateOrigin: templateOrigin
            });
          });
        });
      }
      setDisplayedOutputFiles(files);
      toast({ title: "Results Loaded", description: `Results for run ${completedRunId} fetched.`, variant: "default", className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      toast({ title: "Error Fetching Results", description: error.message, variant: "destructive" });
      setRunResultsInfo(null);
      setDisplayedOutputFiles([]);
    } finally {
      setIsExecuting(false);
    }
  }, [toast]);

  useEffect(() => {
    let pollTimeout: NodeJS.Timeout;
    if (currentRunId && (runStatusInfo?.status !== 'completed' && runStatusInfo?.status !== 'failed')) {
      setIsExecuting(true); // Ensure loading state is active during polling
      const poll = async () => {
        const statusResult = await fetchRunStatus(currentRunId);
        if (statusResult === 'completed') {
          fetchFinalResults(currentRunId);
        } else if (statusResult !== 'failed' && statusResult !== 'error' && statusResult !== 'config_error' && currentRunId) {
          pollTimeout = setTimeout(poll, 3000);
        } else {
          setIsExecuting(false); // Stop loading if failed or error
        }
      };
      poll();
      return () => clearTimeout(pollTimeout);
    } else if (runStatusInfo?.status === 'completed' || runStatusInfo?.status === 'failed') {
        setIsExecuting(false); // Not polling, not executing
    }
  }, [currentRunId, runStatusInfo?.status, fetchRunStatus, fetchFinalResults]);


  const handleDownloadFile = async (runIdToDownload: string, fileNameToDownload: string) => {
    const downloadFileEndpointConfig = getApiEndpoint('/download/:run_id/:filename', 'GET');
    if (!downloadFileEndpointConfig) {
      toast({ title: 'API Config Error', description: "Define '/download/:run_id/:filename' (GET) in API Docs.", variant: 'destructive' });
      return;
    }
    const actualPath = fillPathParameters(downloadFileEndpointConfig.path, { run_id: runIdToDownload, filename: fileNameToDownload });
    try {
      toast({ title: `Preparing Download: ${fileNameToDownload}`, variant: "default" });
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: `Download failed for ${fileNameToDownload}`}));
        throw new Error(errorData.detail || `Error ${response.status}`);
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

  const handleDownloadAllZip = async (runIdToDownload: string) => {
    const downloadZipEndpointConfig = getApiEndpoint('/download/zip/:run_id', 'GET');
    if (!downloadZipEndpointConfig) {
      toast({ title: 'API Config Error', description: "Define '/download/zip/:run_id' (GET) in API Docs.", variant: 'destructive' });
      return;
    }
    setIsDownloadingAll(true);
    const actualPath = fillPathParameters(downloadZipEndpointConfig.path, { run_id: runIdToDownload });
    try {
      toast({ title: "Preparing Zip Archive", description: "This may take a moment...", variant: "default" });
      const response = await fetch(`${FASTAPI_BASE_URL}${actualPath}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: "Zip download failed."}));
        throw new Error(errorData.detail || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onboarding_results_${runIdToDownload}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Archive Download Started", description: `Zip for run ${runIdToDownload} is downloading.`, className: "bg-accent text-accent-foreground"});
    } catch (error: any) {
      toast({ title: "Archive Download Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const resetRunState = () => {
    setCurrentRunId(null);
    setRunStatusInfo(null);
    setRunResultsInfo(null);
    setDisplayedOutputFiles([]);
    setIsExecuting(false);
    // Optionally clear selections:
    // setSelectedTemplateIds([]);
    // setSelectedVendorId(null);
    // setRunName('');
  };


  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight flex items-center"><Workflow className="mr-3 h-8 w-8 text-primary"/> Execute Pipeline</h1>
          <p className="text-muted-foreground">Select uploaded files, configure, and run the processing pipeline. Monitor progress and download results.</p>
        </div>

        {!currentRunId && (
          <>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><ListChecks className="mr-2 h-6 w-6 text-primary"/>File Selection</CardTitle>
                <CardDescription>Choose template and vendor files for this run. Upload files on the "Processing" page if lists are empty.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingFiles && <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading available files...</div>}
                {!isLoadingFiles && availableTemplateFiles.length === 0 && availableVendorFiles.length === 0 && (
                  <Alert variant="default">
                    <Server className="h-4 w-4" />
                    <AlertTitle>No Files Found</AlertTitle>
                    <AlertDescription>Please upload template and vendor files via the "Processing" page first.</AlertDescription>
                  </Alert>
                )}
                
                {availableTemplateFiles.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Select Template Files (Select one or more)</Label>
                    <ScrollArea className="h-40 w-full rounded-md border p-2 mt-1">
                      {availableTemplateFiles.map(fileId => (
                        <div key={fileId} className="flex items-center space-x-2 p-1.5 hover:bg-secondary/50 rounded">
                          <Checkbox
                            id={`template-${fileId}`}
                            checked={selectedTemplateIds.includes(fileId)}
                            onCheckedChange={() => handleTemplateSelectionChange(fileId)}
                          />
                          <Label htmlFor={`template-${fileId}`} className="font-normal text-sm truncate" title={fileId}>{fileId}</Label>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                {availableVendorFiles.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold">Select Vendor File (Select one)</Label>
                    <RadioGroup value={selectedVendorId || ''} onValueChange={setSelectedVendorId} className="mt-1">
                      <ScrollArea className="h-32 w-full rounded-md border p-2">
                        {availableVendorFiles.map(fileId => (
                          <div key={fileId} className="flex items-center space-x-2 p-1.5 hover:bg-secondary/50 rounded">
                            <RadioGroupItem value={fileId} id={`vendor-${fileId}`} />
                            <Label htmlFor={`vendor-${fileId}`} className="font-normal text-sm truncate" title={fileId}>{fileId}</Label>
                          </div>
                        ))}
                      </ScrollArea>
                    </RadioGroup>
                  </div>
                )}
                 <Button onClick={fetchAvailableFiles} variant="outline" size="sm" disabled={isLoadingFiles} className="mt-2">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh File Lists
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><Settings2 className="mr-2 h-6 w-6 text-primary"/>Run Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="run-name" className="text-base font-semibold">Run Name (Optional)</Label>
                  <Input id="run-name" placeholder="e.g., Q1_Vendor_Batch" value={runName} onChange={(e) => setRunName(e.target.value)} className="mt-1"/>
                </div>
                {/* <div>
                  <h3 className="text-base font-semibold mb-2">Advanced Processing Options (Backend support TBD)</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="adv-opt-1" checked={advancedOption1} onCheckedChange={(c) => setAdvancedOption1(c as boolean)} />
                    <Label htmlFor="adv-opt-1" className="font-normal">Enable Strict Schema Validation</Label>
                  </div>
                </div> */}
                <Button onClick={handleExecutePipeline} disabled={isExecuting || isLoadingFiles || selectedTemplateIds.length === 0 || !selectedVendorId} className="w-full sm:w-auto">
                  {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                  Execute Pipeline
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {currentRunId && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <Workflow className="mr-2 h-6 w-6 text-primary" /> Run Status: <span className="ml-2 font-code text-lg truncate">{currentRunId}</span>
              </CardTitle>
              {isExecuting && runStatusInfo && runStatusInfo.status !== 'completed' && runStatusInfo.status !== 'failed' && (
                <>
                  <div className="flex items-center text-sm text-muted-foreground mt-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Status: {runStatusInfo.status} - {runStatusInfo.current_stage} ({runStatusInfo.progress}%)
                  </div>
                  <Progress value={runStatusInfo.progress} className="w-full h-2.5 mt-2" />
                </>
              )}
              {runStatusInfo && (runStatusInfo.status === 'completed' || runStatusInfo.status === 'failed') && (
                 <Alert variant={runStatusInfo.status === 'failed' ? 'destructive': 'default'} className="mt-2">
                    <AlertTitle>Run {runStatusInfo.status.replace(/\b\w/g, l => l.toUpperCase())}</AlertTitle>
                    <AlertDescription>
                        {runStatusInfo.status === 'completed' ? `Completed successfully. Stage: ${runStatusInfo.current_stage} (${runStatusInfo.progress}%)` : `Failed at stage: ${runStatusInfo.current_stage}. Check server logs for details.`}
                    </AlertDescription>
                 </Alert>
              )}
            </CardHeader>
            <CardContent>
              {runResultsInfo && runResultsInfo.status === 'completed' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Output Files:</h3>
                  {displayedOutputFiles.length === 0 && <p className="text-muted-foreground">No output files generated or found for this run.</p>}
                  <ScrollArea className="h-60 w-full rounded-md border p-2">
                    {displayedOutputFiles.map(file => (
                      <div key={file.id} className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded">
                        <div className="flex items-center gap-2 min-w-0">
                           <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                           <div className="truncate">
                            <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">Type: {file.type} (from {file.templateOrigin})</p>
                           </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(currentRunId, file.path)} aria-label={`Download ${file.name}`}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                  {displayedOutputFiles.length > 0 && (
                    <Button onClick={() => handleDownloadAllZip(currentRunId)} disabled={isDownloadingAll} className="w-full mt-2">
                      {isDownloadingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileArchive className="mr-2 h-4 w-4" />}
                      Download All as ZIP
                    </Button>
                  )}
                  {runResultsInfo.metrics && Object.keys(runResultsInfo.metrics).length > 0 && (
                    <div className="mt-4 p-3 border rounded-md bg-secondary/30">
                      <h4 className="font-semibold mb-1 text-md">Processing Metrics:</h4>
                      <pre className="text-xs p-2 bg-background rounded overflow-x-auto">
                        {JSON.stringify(runResultsInfo.metrics, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
               <Button variant="outline" onClick={resetRunState} className="w-full mt-6">
                 Configure New Run
               </Button>
            </CardContent>
          </Card>
        )}
        
         <Alert variant="default" className="mt-8 border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold text-primary">API Endpoint Requirements</AlertTitle>
            <AlertDescription className="text-primary/90 text-xs">
                This page requires the following API endpoints to be defined in API Docs and implemented in your FastAPI backend:
                <ul>
                    <li>GET <code>/template/list</code> - To list available template files.</li>
                    <li>GET <code>/vendor/list</code> - To list available vendor files.</li>
                    <li>POST <code>/process</code> - To start a new pipeline run.</li>
                    <li>GET <code>/status/:run_id</code> - To poll for run status and progress.</li>
                    <li>GET <code>/results/:run_id</code> - To fetch final results and output file lists.</li>
                    <li>GET <code>/download/:run_id/:filename</code> - To download individual files.</li>
                    <li>GET <code>/download/zip/:run_id</code> - To download all outputs as a ZIP archive.</li>
                </ul>
                Ensure your FastAPI server (default: {FASTAPI_BASE_URL}) is running with CORS enabled.
            </AlertDescription>
        </Alert>

      </div>
    </AppLayout>
  );
}

