'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlayCircle, Settings2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PipelineSettingsSection() {
  const [runName, setRunName] = useState<string>('');
  const [advancedOption1, setAdvancedOption1] = useState<boolean>(false);
  const [advancedOption2, setAdvancedOption2] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const { toast } = useToast();

  const handleExecutePipeline = () => {
    if (!runName.trim()) {
      toast({
        title: "Validation Error",
        description: "Run Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    setIsExecuting(true);
    // Simulate pipeline execution
    setTimeout(() => {
      setIsExecuting(false);
      toast({
        title: "Pipeline Executed",
        description: `Run "${runName}" completed successfully.`,
        variant: "default",
        className: "bg-accent text-accent-foreground"
      });
      // Potentially clear inputs or update other state here
      setRunName('');
      setAdvancedOption1(false);
      setAdvancedOption2(false);
    }, 3000);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <Settings2 className="mr-2 h-6 w-6 text-primary" /> Pipeline Execution &amp; Settings
        </CardTitle>
        <CardDescription>Configure and start your Excel processing pipeline.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="run-name" className="text-base font-semibold">Run Name</Label>
          <Input
            id="run-name"
            placeholder="e.g., Q4_Report_Processing"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <h3 className="text-base font-semibold mb-2">Advanced Processing Options</h3>
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
          <Button onClick={handleExecutePipeline} disabled={isExecuting} className="w-full sm:w-auto">
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
