
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlayCircle, Settings2, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";

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
      return endpoints.find(ep => ep.path === pathKey && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

interface PipelineSettingsSectionProps {
  templateFileIds: string[]; // These are IDs/filenames from the backend
  vendorFileIds: string[];   // These are IDs/filenames from the backend
  onPipelineExecuted: (runId: string) => void;
  hasFilesToProcess: boolean;
}

export default function PipelineSettingsSection({ templateFileIds, vendorFileIds, onPipelineExecuted, hasFilesToProcess }: PipelineSettingsSectionProps) {
  const [runName, setRunName] = useState<string>(''); // Optional for now, FastAPI /process doesn't use it
  const [advancedOption1, setAdvancedOption1] = useState<boolean>(false); // Example option
  const [advancedOption2, setAdvancedOption2] = useState<boolean>(false); // Example option
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleExecutePipeline = async () => {
    if (!hasFilesToProcess) {
       toast({
        title: "No Files Uploaded",
        description: "Please upload template and vendor files before executing the pipeline.",
        variant: "destructive",
      });
      return;
    }
    if (templateFileIds.length === 0 || vendorFileIds.length === 0) {
      toast({
        title: "Missing Files",
        description: "Both template and vendor files must be uploaded and confirmed by the backend to start processing.",
        variant: "destructive",
      });
      return;
    }
    // FastAPI /process expects a single vendor file ID string.
    if (vendorFileIds.length === 0) {
      toast({
        title: "Missing Vendor File",
        description: "At least one vendor file must be uploaded.",
        variant: "destructive",
      });
      return;
    }

    const processApiEndpoint = getApiEndpoint('/process', 'POST');
    if (!processApiEndpoint) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/process' (POST) endpoint is not defined in API Docs. Please configure it to execute the pipeline.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }

    setIsExecuting(true);
    
    // FastAPI's ProcessRequest expects:
    // {"templates": ["template_id1.xlsx", "template_id2.xlsx"], "vendor": "vendor_master_id.xlsx"}
    const requestBody = {
      templates: templateFileIds, // Already a list of strings (backend IDs)
      vendor: vendorFileIds[0], // FastAPI /process expects a single vendor file string
      // run_name: runName, // If your backend supports it
      // advanced_options: { strict_schema_validation: advancedOption1, generate_detailed_log: advancedOption2 } // If backend supports
    };

    try {
      const response = await fetch(`${FASTAPI_BASE_URL}${processApiEndpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({detail: "Unknown error during pipeline execution."}));
        throw new Error(errorData.detail || `Pipeline execution failed. Status: ${response.status}`);
      }

      const result = await response.json(); // Expects { "run_id": "...", "status": "queued", "message": "..." }
      onPipelineExecuted(result.run_id); 

      toast({
        title: "Pipeline Execution Started",
        description: `Run ID: ${result.run_id}. Status: ${result.status}. ${result.message}`,
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
      
      setRunName(''); 
      setAdvancedOption1(false);
      setAdvancedOption2(false);

    } catch (error: any) {
      console.error('Error executing pipeline:', error);
      toast({
        title: 'Pipeline Execution Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Settings2 className="mr-2 h-6 w-6 text-primary" /> Pipeline Execution &amp; Settings
        </CardTitle>
        <CardDescription>Configure and start your Excel processing pipeline. Ensure API endpoints are defined in API Docs and FastAPI server is running with CORS.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure the 'POST' endpoint for '/process' is defined on the API Docs page. Template and Vendor files must be uploaded first and confirmed by the backend.
            </AlertDescription>
        </Alert>
        <div>
          <Label htmlFor="run-name" className="text-base font-semibold">Run Name (Optional - Not sent to current backend)</Label>
          <Input
            id="run-name"
            placeholder="e.g., Q4_Report_Processing"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <h3 className="text-base font-semibold mb-2">Advanced Processing Options (Not sent to current backend)</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="advanced-option-1"
                checked={advancedOption1}
                onCheckedChange={(checked) => setAdvancedOption1(checked as boolean)}
              />
              <Label htmlFor="advanced-option-1" className="font-normal">Enable Strict Schema Validation</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="advanced-option-2"
                checked={advancedOption2}
                onCheckedChange={(checked) => setAdvancedOption2(checked as boolean)}
              />
              <Label htmlFor="advanced-option-2" className="font-normal">Generate Detailed Error Log</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleExecutePipeline} disabled={isExecuting || !hasFilesToProcess} className="w-full sm:w-auto">
            {isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            {isExecuting ? 'Executing...' : 'Execute Pipeline'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
