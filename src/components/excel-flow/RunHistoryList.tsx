
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, HistoryIcon, Loader2, AlertTriangle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RunFile {
  id: string;
  name: string;
  size: string;
}

interface ArchivedRun {
  id: string;
  runName: string;
  executionDate: string; // ISO date string
  status: 'Completed' | 'Failed' | 'In Progress';
  files: RunFile[];
  templateFileCount: number;
  vendorFileCount: number;
}

const mockArchivedRuns: ArchivedRun[] = [
  {
    id: 'run_001',
    runName: 'Q3_Financial_Report',
    executionDate: new Date(2023, 8, 15, 10, 30, 0).toISOString(),
    status: 'Completed',
    templateFileCount: 2,
    vendorFileCount: 5,
    files: [
      { id: 'file_001_a', name: 'processed_q3_data.xlsx', size: '3.1 MB' },
      { id: 'file_001_b', name: 'q3_summary.json', size: '450 KB' },
    ],
  },
  {
    id: 'run_002',
    runName: 'Monthly_Sales_Update_Aug',
    executionDate: new Date(2023, 7, 28, 14, 0, 0).toISOString(),
    status: 'Failed',
    templateFileCount: 1,
    vendorFileCount: 3,
    files: [{ id: 'file_002_a', name: 'error_log_aug.txt', size: '5 KB' }],
  },
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

export default function RunHistoryList() {
  const [archivedRuns, setArchivedRuns] = useState<ArchivedRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchArchivedRuns = async () => {
      setIsLoading(true);
      // Assuming a generic endpoint for listing all runs. Adapt if using /results/:run_id for each.
      const listRunsEndpointPath = `/history/list`; // Example path, define in API Docs
      const listRunsEndpoint = getApiEndpoint(listRunsEndpointPath, 'GET');

      if (!listRunsEndpoint) {
        toast({
          title: 'API Endpoint Not Configured',
          description: `The '${listRunsEndpointPath}' (GET) endpoint for listing run history is not defined in API Docs. Displaying mock data.`,
          variant: 'destructive',
          duration: 7000,
        });
        setArchivedRuns(mockArchivedRuns); // Fallback to mock data
        setIsLoading(false);
        return;
      }

      toast({
        title: "Simulating Fetching Run History",
        description: `Using endpoint: GET ${listRunsEndpoint.path}`,
        variant: "default",
      });
      // Simulate fetching
      setTimeout(() => {
        // In a real app: const response = await fetch(listRunsEndpoint.path); const data = await response.json(); setArchivedRuns(data);
        setArchivedRuns(mockArchivedRuns);
        setIsLoading(false);
      }, 1000);
    };
    fetchArchivedRuns();
  }, [toast]);

  const handleDownloadFile = (runId: string, runName: string, fileName: string) => {
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
    const actualPath = fillPathParameters(downloadEndpoint.path, { run_id: runId, filename: fileName });
    toast({
      title: `Simulating Download: ${fileName}`,
      description: `From run: ${runName}. Using GET ${actualPath}. Download will start shortly.`,
      variant: 'default',
    });
    // Actual download logic here
  };

  const handleDownloadRunArchive = (runId: string, runName: string) => {
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
    const actualPath = fillPathParameters(downloadZipEndpoint.path, { run_id: runId });
    toast({
      title: `Simulating Archive Preparation for ${runName}`,
      description: `Using GET ${actualPath}. This may take a moment...`,
      variant: 'default',
    });
    
    setTimeout(() => {
      toast({
        title: 'Archive Downloaded (Simulated)',
        description: `${runName}_archive.zip has been downloaded.`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
    }, 2000);
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <HistoryIcon className="mr-2 h-6 w-6 text-primary" /> Archived Runs
          </CardTitle>
          <CardDescription>Loading previous pipeline execution details...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <HistoryIcon className="mr-2 h-6 w-6 text-primary" /> Archived Runs
        </CardTitle>
        <CardDescription>Review details and download files from past pipeline executions. Uses API Docs configurations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default" className="border-primary/30 bg-primary/5 mb-4">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure 'GET' endpoints like '/history/list' (or your equivalent for fetching runs), '/download/:run_id/:filename', and '/download/zip/:run_id' are defined in API Docs. Remember to use ':' for path parameters e.g. /download/:run_id/:filename.
            </AlertDescription>
        </Alert>
        {archivedRuns.length === 0 ? (
           <p className="text-muted-foreground text-center py-4">No run history available.</p>
        ) : (
        <Accordion type="single" collapsible className="w-full">
          {archivedRuns.map((run) => (
            <AccordionItem value={run.id} key={run.id} className="border-b">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex justify-between items-center w-full pr-4">
                  <div className="text-left">
                    <h3 className="font-semibold text-md text-primary">{run.runName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Executed: {format(new Date(run.executionDate), "PPp")}
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
                    <p><span className="font-medium">Template Files:</span> {run.templateFileCount}</p>
                    <p><span className="font-medium">Vendor Files:</span> {run.vendorFileCount}</p>
                  </div>
                  <h4 className="font-medium text-sm pt-2">Output Files:</h4>
                  {run.files.length > 0 ? (
                    <ul className="space-y-2">
                      {run.files.map((file) => (
                        <li key={file.id} className="flex items-center justify-between p-2 border rounded-md bg-background shadow-sm">
                          <span className="text-xs">{file.name} ({file.size})</span>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(run.id, run.runName, file.name)} aria-label={`Download ${file.name}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No output files for this run.</p>
                  )}
                  <Button onClick={() => handleDownloadRunArchive(run.id, run.runName)} size="sm" className="w-full mt-2">
                    <FileArchive className="mr-2 h-4 w-4" /> Download Full Archive for this Run
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
