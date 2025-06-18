'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BotMessageSquare, CheckCircle2, Percent, Loader2, Info } from 'lucide-react';
import { compareJsonAccuracy, CompareJsonAccuracyInput, CompareJsonAccuracyOutput } from '@/ai/flows/compare-json-accuracy';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

    try {
      JSON.parse(manualJson);
      JSON.parse(aiJson);
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: 'One or both inputs are not valid JSON. Please check and try again.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    setComparisonResult(null);

    try {
      const input: CompareJsonAccuracyInput = { manualJson, aiJson };
      const result = await compareJsonAccuracy(input);
      setComparisonResult(result);
      toast({
        title: 'Comparison Complete',
        description: 'Accuracy analysis finished successfully.',
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
    } catch (error) {
      console.error('Error comparing JSON:', error);
      toast({
        title: 'Comparison Failed',
        description: 'An error occurred while comparing the JSON files. Please try again.',
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
          Paste your manually created JSON and AI-generated JSON below to get a semantic accuracy score and a summary of differences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
