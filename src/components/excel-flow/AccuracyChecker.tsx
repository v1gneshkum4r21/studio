
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BotMessageSquare, CheckCircle2, Percent, Loader2, Info, AlertTriangle } from 'lucide-react';
// import { compareJsonAccuracy, CompareJsonAccuracyInput, CompareJsonAccuracyOutput } from '@/ai/flows/compare-json-accuracy'; // Keep if also using Genkit
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
      return endpoints.find(ep => ep.path === pathKey && ep.method === method);
    }
  } catch (error) {
    console.error("Error retrieving API endpoint from localStorage:", error);
  }
  return undefined;
};

// Assuming CompareJsonAccuracyOutput structure based on Genkit flow
interface CompareJsonAccuracyOutput {
  accuracyScore: number;
  differencesSummary: string;
}

export default function AccuracyChecker() {
  const [manualJson, setManualJson] = useState<string>('');
  const [aiJson, setAiJson] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<CompareJsonAccuracyOutput | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!manualJson.trim() || !aiJson.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Both JSON fields must be filled.',
        variant: 'destructive',
      });
      return;
    }

    let parsedManualJson, parsedAiJson;
    try {
      parsedManualJson = JSON.parse(manualJson);
      parsedAiJson = JSON.parse(aiJson);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'One or both inputs are not valid JSON. Please check and try again.',
        variant: 'destructive',
      });
      return;
    }

    const compareApiEndpoint = getApiEndpoint('/compare', 'POST');
    if (!compareApiEndpoint) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/compare' (POST) endpoint is not defined in API Docs. Please configure it to proceed.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }
    
    setIsLoading(true);
    setComparisonResult(null);

    try {
      // If you still want to use Genkit in parallel or as fallback:
      // const genkitInput: CompareJsonAccuracyInput = { manualJson, aiJson };
      // const genkitResult = await compareJsonAccuracy(genkitInput);
      // setComparisonResult(genkitResult);

      const requestBody = {
        manual_json: manualJson, // FastAPI expects snake_case
        ai_json: aiJson,       // FastAPI expects snake_case
      };

      const response = await fetch(`http://localhost:8000${compareApiEndpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({detail: "Comparison request failed."}));
        // The FastAPI /compare endpoint is not in the provided code, so this will likely fail
        // For now, let's assume it returns a structure similar to CompareJsonAccuracyOutput if it existed
        if (response.status === 404) { // Endpoint not found
             throw new Error(`Comparison endpoint ${compareApiEndpoint.path} not found on server. Ensure it's implemented in FastAPI.`);
        }
        throw new Error(errorData.detail || `Comparison failed. Status: ${response.status}`);
      }
      
      const result: CompareJsonAccuracyOutput = await response.json();
      // Assuming FastAPI returns { "accuracy_score": number, "differences_summary": string }
      // This needs to be defined in your FastAPI /compare endpoint
      setComparisonResult({
        accuracyScore: result.accuracyScore, // Map snake_case from backend if needed
        differencesSummary: result.differencesSummary,
      });

      toast({
        title: 'Comparison Complete (via API)',
        description: 'Accuracy analysis finished successfully.',
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
    } catch (error: any) {
      console.error('Error comparing JSON via API:', error);
      toast({
        title: 'Comparison Failed',
        description: error.message || 'An error occurred while comparing the JSON files. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <BotMessageSquare className="mr-2 h-6 w-6 text-primary" /> JSON Accuracy Analyzer
        </CardTitle>
        <CardDescription>
          Paste your manually created JSON and AI-generated JSON below. Ensure FastAPI server is running with CORS and the '/compare' endpoint is configured in API Docs and implemented in FastAPI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-xs">
                Ensure the 'POST' endpoint for '/compare' is defined on the API Docs page and implemented in your FastAPI backend for this feature to work.
            </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="manual-json" className="text-base font-semibold">Manually Created JSON</Label>
            <Textarea
              id="manual-json"
              placeholder='{\n  "name": "Example",\n  "value": 123\n}'
              value={manualJson}
              onChange={(e) => setManualJson(e.target.value)}
              className="mt-2 min-h-[200px] font-code text-sm"
              rows={10}
            />
          </div>
          <div>
            <Label htmlFor="ai-json" className="text-base font-semibold">AI-Generated JSON</Label>
            <Textarea
              id="ai-json"
              placeholder='{\n  "name": "Example AI",\n  "value": 123,\n  "extra_field": "AI was here"\n}'
              value={aiJson}
              onChange={(e) => setAiJson(e.target.value)}
              className="mt-2 min-h-[200px] font-code text-sm"
              rows={10}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Analyzing...' : 'Compare Accuracy'}
          </Button>
        </div>

        {comparisonResult && (
          <Card className="mt-6 bg-secondary/30">
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center">
                <Info className="mr-2 h-5 w-5 text-primary" /> Comparison Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <Alert>
                <Percent className="h-5 w-5" />
                <AlertTitle className="font-semibold">Semantic Accuracy Score</AlertTitle>
                <AlertDescription className="text-2xl font-bold text-primary">
                  {(comparisonResult.accuracyScore * 100).toFixed(1)}%
                </AlertDescription>
              </Alert>
              
              <div>
                <h4 className="font-semibold text-md mb-1">Differences Summary:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 border rounded-md bg-background">
                  {comparisonResult.differencesSummary}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
