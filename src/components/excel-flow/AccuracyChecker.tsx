
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BotMessageSquare, CheckCircle2, Percent, Loader2, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

// Expected response from FastAPI's /compare endpoint (needs to be implemented in FastAPI)
// Based on compare.py llm_accuracy function's return structure, slightly simplified for frontend
interface BackendCompareResponse {
  basic_accuracy: string; // e.g., "95.00%"
  semantic_accuracy: string; // e.g., "98.50%"
  explanation: string;
  details: Array<{
    Field: string;
    ManualValue: any;
    AIValue: any;
    Status: string; // "Correct (Exact)", "Correct (Semantic)", "Incorrect"
    Explanation: string;
  }>;
  stats?: { // Optional stats block
    total_fields: number;
    exact_matches: number;
    semantic_matches: number;
    incorrect: number;
  };
  // FastAPI should return "accuracy_score" and "differences_summary"
  // to match the original CompareJsonAccuracyOutput if the Genkit flow definition is reused.
  // For now, we map from the more detailed compare.py structure.
  accuracyScore?: number; // Derived from semantic_accuracy
  differencesSummary?: string; // Derived from explanation or details
}

// Frontend display structure, can be simpler or map from BackendCompareResponse
interface ComparisonDisplayResult {
  accuracyScore: number; // Numeric 0-1
  differencesSummary: string; // Text summary
  detailedResults?: BackendCompareResponse['details'];
  fullStats?: BackendCompareResponse['stats'];
}


export default function AccuracyChecker() {
  const [manualJson, setManualJson] = useState<string>('');
  const [aiJson, setAiJson] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonDisplayResult | null>(null);
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
        description: "The '/compare' (POST) endpoint is not defined in API Docs. Please configure it and ensure it's implemented in your FastAPI backend.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }
    
    setIsLoading(true);
    setComparisonResult(null);

    try {
      const requestBody = { // Matches FastAPI CompareRequest model
        manual_json: manualJson, 
        ai_json: aiJson,       
      };

      const response = await fetch(`${FASTAPI_BASE_URL}${compareApiEndpoint.path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({detail: "Comparison request failed."}));
        if (response.status === 404) { 
             throw new Error(`Comparison endpoint ${compareApiEndpoint.path} not found on server. Ensure it's implemented in FastAPI.`);
        }
        throw new Error(errorData.detail || `Comparison failed. Status: ${response.status}`);
      }
      
      const result: BackendCompareResponse = await response.json();
      
      // Map FastAPI response (based on compare.py) to frontend display structure
      const accuracyScoreNumeric = parseFloat(result.semantic_accuracy?.replace('%','')) / 100 || 0;

      setComparisonResult({
        accuracyScore: accuracyScoreNumeric,
        differencesSummary: result.explanation || "Comparison complete.",
        detailedResults: result.details,
        fullStats: result.stats
      });

      toast({
        title: 'Comparison Complete (via API)',
        description: `Semantic Accuracy: ${result.semantic_accuracy || 'N/A'}. ${result.explanation}`,
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
        duration: 7000,
      });
    } catch (error: any) {
      console.error('Error comparing JSON via API:', error);
      toast({
        title: 'Comparison Failed',
        description: error.message || 'An error occurred while comparing the JSON files. Please ensure the /compare endpoint is implemented in FastAPI.',
        variant: 'destructive',
        duration: 10000,
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
          Paste your manually created JSON and AI-generated JSON below. This feature requires the '/compare' POST endpoint to be implemented in your FastAPI backend and defined in API Docs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-primary/30 bg-primary/5">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle className="font-semibold text-primary">Backend Endpoint Required</AlertTitle>
            <AlertDescription className="text-primary/90 text-xs">
                This AI Accuracy Comparison tool requires a backend 'POST' endpoint at '/compare' (as defined in API Docs).
                This endpoint should accept two JSON strings ('manual_json', 'ai_json') and return comparison results, ideally including 'accuracyScore' and 'differencesSummary'.
                The provided FastAPI code does not currently include this endpoint.
            </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="manual-json" className="text-base font-semibold">Manually Created JSON</Label>
            <Textarea
              id="manual-json"
              placeholder='{\n  "sheet": [\n    {"Field_name": "Example", "Answer": 123}\n  ]\n}'
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
              placeholder='{\n  "sheet": [\n    {"Field_name": "Example", "Answer": 124}\n  ]\n}'
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

              {comparisonResult.fullStats && (
                <div className="mt-4">
                  <h4 className="font-semibold text-md mb-1">Full Statistics:</h4>
                  <pre className="text-xs p-3 border rounded-md bg-background overflow-x-auto">
                    {JSON.stringify(comparisonResult.fullStats, null, 2)}
                  </pre>
                </div>
              )}

              {comparisonResult.detailedResults && comparisonResult.detailedResults.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-md mb-1">Detailed Field Comparison:</h4>
                  <div className="max-h-96 overflow-y-auto p-3 border rounded-md bg-background">
                    {comparisonResult.detailedResults.map((detail, index) => (
                      <div key={index} className="mb-2 pb-2 border-b last:border-b-0">
                        <p className="text-sm font-medium">Field: <span className="font-code">{detail.Field}</span></p>
                        <p className="text-xs">Manual: <span className="font-code">{JSON.stringify(detail.ManualValue)}</span></p>
                        <p className="text-xs">AI: <span className="font-code">{JSON.stringify(detail.AIValue)}</span></p>
                        <p className={`text-xs font-semibold ${detail.Status.includes("Correct") ? 'text-green-600' : 'text-red-600'}`}>Status: {detail.Status}</p>
                        <p className="text-xs text-muted-foreground">Explanation: {detail.Explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
