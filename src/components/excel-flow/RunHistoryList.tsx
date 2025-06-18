'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, HistoryIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

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
  {
    id: 'run_003',
    runName: 'EOY_Data_Consolidation',
    executionDate: new Date(2023, 11, 20, 16, 45, 0).toISOString(),
    status: 'Completed',
    templateFileCount: 5,
    vendorFileCount: 25,
    files: [
      { id: 'file_003_a', name: 'consolidated_eoy_report.xlsx', size: '15.7 MB' },
      { id: 'file_003_b', name: 'validation_summary_eoy.pdf', size: '1.2 MB' },
      { id: 'file_003_c', name: 'eoy_processing_log.txt', size: '35 KB' },
    ],
  },
];

export default function RunHistoryList() {
  const [archivedRuns, setArchivedRuns] = useState<ArchivedRun[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching archived runs
    setTimeout(() => {
      setArchivedRuns(mockArchivedRuns);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleDownloadFile = (runName: string, fileName: string) => {
    toast({
      title: `Downloading ${fileName}`,
      description: `From run: ${runName}. Download will start shortly.`,
      variant: 'default',
    });
    // Actual download logic would go here
  };

  const handleDownloadRunArchive = (runName: string) => {
    toast({
      title: `Preparing Archive for ${runName}`,
      description: 'This may take a moment...',
      variant: 'default',
    });
    // Simulate zip creation and download
    setTimeout(() => {
      toast({
        title: 'Archive Downloaded',
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
        <CardDescription>Review details and download files from past pipeline executions.</CardDescription>
      </CardHeader>
      <CardContent>
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
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(run.runName, file.name)} aria-label={`Download ${file.name}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">No output files for this run.</p>
                  )}
                  <Button onClick={() => handleDownloadRunArchive(run.runName)} size="sm" className="w-full mt-2">
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
