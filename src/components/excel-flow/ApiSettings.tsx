'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, KeyRound, CheckCircle, AlertTriangle, Loader2, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API_CONFIG_STORAGE_KEY = 'excelFlowApiConfig';

interface ApiConfig {
  openAIApiKey: string;
  azureApiKey: string;
}

export default function ApiSettings() {
  const [config, setConfig] = useState<ApiConfig>({ openAIApiKey: '', azureApiKey: '' });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load config from localStorage on mount
    const storedConfig = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (storedConfig) {
      try {
        setConfig(JSON.parse(storedConfig));
      } catch (e) {
        console.error("Failed to parse stored API config", e);
        toast({
          title: "Error Loading Settings",
          description: "Could not load previously saved API settings.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({ ...prevConfig, [name]: value }));
  };

  const handleSaveConfig = () => {
    setIsLoading(true);
    try {
      localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
      toast({
        title: 'Settings Saved',
        description: 'Your API configurations have been saved locally.',
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
    } catch (error) {
       toast({
        title: 'Error Saving Settings',
        description: 'Could not save API settings to local storage.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleValidateKeys = () => {
    setIsValidating(true);
    // Simulate API key validation
    setTimeout(() => {
      setIsValidating(false);
      const { openAIApiKey, azureApiKey } = config;
      if (openAIApiKey && azureApiKey) { // Simple check, replace with actual validation
         toast({
          title: 'API Keys Validated',
          description: 'Both OpenAI and Azure API keys appear to be valid (mock validation).',
          variant: 'default',
          className: 'bg-accent text-accent-foreground',
        });
      } else {
         toast({
          title: 'Validation Incomplete',
          description: 'One or more API keys are missing or invalid (mock validation).',
          variant: 'destructive',
        });
      }
    }, 2000);
  };

  const handleExportConfig = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "excelFlow_api_config.json";
    link.click();
    toast({ title: "Configuration Exported", description: "excelFlow_api_config.json downloaded."});
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          // Add some validation for imported structure if needed
          if (typeof importedConfig.openAIApiKey === 'string' && typeof importedConfig.azureApiKey === 'string') {
            setConfig(importedConfig);
            toast({ title: "Configuration Imported", description: "Settings loaded from file.", className: "bg-accent text-accent-foreground" });
          } else {
            throw new Error("Invalid config file structure");
          }
        } catch (error) {
          toast({ title: "Import Failed", description: "Invalid configuration file.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }
     // Reset file input to allow re-uploading the same file
    if (event.target) {
        event.target.value = "";
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <KeyRound className="mr-2 h-6 w-6 text-primary" /> API Key Management
        </CardTitle>
        <CardDescription>
          Configure API keys for external services. Keys are stored locally in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Security Notice</AlertTitle>
          <AlertDescription>
            API keys are stored in your browser's local storage. For production environments, consider more secure key management solutions.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="openAIApiKey" className="text-base font-semibold">OpenAI API Key</Label>
            <Input
              id="openAIApiKey"
              name="openAIApiKey"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={config.openAIApiKey}
              onChange={handleInputChange}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="azureApiKey" className="text-base font-semibold">Azure API Key (Optional)</Label>
            <Input
              id="azureApiKey"
              name="azureApiKey"
              type="password"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={config.azureApiKey}
              onChange={handleInputChange}
              className="mt-2"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
          <Button variant="outline" onClick={handleValidateKeys} disabled={isValidating || isLoading} className="w-full sm:w-auto">
            {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {isValidating ? 'Validating...' : 'Validate Keys'}
          </Button>
          <Button onClick={handleSaveConfig} disabled={isLoading || isValidating} className="w-full sm:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

         <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 border-t pt-4">
            <Button variant="outline" onClick={handleExportConfig} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Export Config
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Label htmlFor="import-config-input">
                <Upload className="mr-2 h-4 w-4" /> Import Config
                <Input id="import-config-input" type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </Label>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
