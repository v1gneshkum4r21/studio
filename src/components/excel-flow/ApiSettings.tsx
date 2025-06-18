
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, KeyRound, CheckCircle, AlertTriangle, Loader2, Upload, Download, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const API_CONFIG_STORAGE_KEY = 'excelFlowApiConfig';
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints'; // For endpoint definitions

interface ApiConfig {
  openAIApiKey: string;
  azureApiKey: string; // Existing generic Azure Key

  // Azure OpenAI gpt-4o-mini
  azureOpenAIApiKey_Gpt4oMini: string;
  azureOpenAIApiBaseUrl_Gpt4oMini: string;
  azureOpenAIApiVersion_Gpt4oMini: string;
  azureOpenAIGpt4DeploymentName_Gpt4oMini: string;
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: string;

  // Azure OpenAI gpt-3.5-turbo
  azureOpenAIApiKey_Gpt35Turbo: string;
  azureOpenAIApiBaseUrl_Gpt35Turbo: string;
  azureOpenAIGpt4DeploymentName_Gpt35Turbo: string;
  azureOpenAIChatGptDeploymentName_Gpt35Turbo: string;
  azureOpenAIApiVersion_Gpt35Turbo: string;
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}

// Helper function to get API endpoint from localStorage
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

const initialConfig: ApiConfig = {
  openAIApiKey: '',
  azureApiKey: '',
  azureOpenAIApiKey_Gpt4oMini: '',
  azureOpenAIApiBaseUrl_Gpt4oMini: '',
  azureOpenAIApiVersion_Gpt4oMini: '',
  azureOpenAIGpt4DeploymentName_Gpt4oMini: '',
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: '',
  azureOpenAIApiKey_Gpt35Turbo: '',
  azureOpenAIApiBaseUrl_Gpt35Turbo: '',
  azureOpenAIGpt4DeploymentName_Gpt35Turbo: '',
  azureOpenAIChatGptDeploymentName_Gpt35Turbo: '',
  azureOpenAIApiVersion_Gpt35Turbo: '',
};

export default function ApiSettings() {
  const [config, setConfig] = useState<ApiConfig>(initialConfig);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedConfig = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig(prevConfig => ({ ...prevConfig, ...parsedConfig }));
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
    const validateEndpoint = getApiEndpoint('/config/validate', 'POST');
    if (!validateEndpoint) {
      toast({
        title: 'API Endpoint Not Configured',
        description: "The '/config/validate' (POST) endpoint is not defined in API Docs. Please configure it to proceed.",
        variant: 'destructive',
        duration: 7000,
      });
      return;
    }

    setIsValidating(true);
    toast({
      title: 'Simulating Key Validation',
      description: `Using endpoint: POST ${validateEndpoint.path}. This is a simulation.`,
      variant: 'default',
    });

    setTimeout(() => {
      setIsValidating(false);
      // Basic check if any key is filled - in a real app, this would be an API call
      const hasSomeKeys = Object.values(config).some(value => typeof value === 'string' && value.trim() !== '');
      if (hasSomeKeys) { 
         toast({
          title: 'API Keys Validated (Simulated)',
          description: 'At least one API key field has a value. Further validation would occur server-side.',
          variant: 'default',
          className: 'bg-accent text-accent-foreground',
        });
      } else {
         toast({
          title: 'Validation Incomplete (Simulated)',
          description: 'No API keys seem to be entered.',
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
          // Simple validation, ensure it's an object
          if (typeof importedConfig === 'object' && importedConfig !== null) {
            setConfig(prev => ({...prev, ...importedConfig})); // Merge with existing to preserve all keys
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
          Configure API keys for external services. Keys are stored locally in your browser. Validation uses endpoints from API Docs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Security Notice &amp; API Docs</AlertTitle>
          <AlertDescription>
            API keys are stored in your browser's local storage. For key validation and other operations, ensure relevant endpoints (e.g., '/config/validate') are defined on the API Docs page.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="openAIApiKey" className="text-base font-semibold">OpenAI API Key (Generic)</Label>
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
            <Label htmlFor="azureApiKey" className="text-base font-semibold">Azure API Key (Generic/Optional)</Label>
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

        <Separator className="my-6" />

        <div>
            <h3 className="text-lg font-headline flex items-center mb-3"><Settings className="mr-2 h-5 w-5 text-primary/80" /> Azure OpenAI GPT-4o-mini Settings</h3>
            <div className="space-y-4 pl-2 border-l-2 border-primary/30 ml-1">
                 <div>
                    <Label htmlFor="azureOpenAIApiKey_Gpt4oMini">API Key</Label>
                    <Input id="azureOpenAIApiKey_Gpt4oMini" name="azureOpenAIApiKey_Gpt4oMini" type="password" placeholder="Azure OpenAI API Key" value={config.azureOpenAIApiKey_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiBaseUrl_Gpt4oMini">API Base URL</Label>
                    <Input id="azureOpenAIApiBaseUrl_Gpt4oMini" name="azureOpenAIApiBaseUrl_Gpt4oMini" placeholder="e.g., https://your-resource.openai.azure.com" value={config.azureOpenAIApiBaseUrl_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiVersion_Gpt4oMini">API Version</Label>
                    <Input id="azureOpenAIApiVersion_Gpt4oMini" name="azureOpenAIApiVersion_Gpt4oMini" placeholder="e.g., 2024-02-15-preview" value={config.azureOpenAIApiVersion_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIGpt4DeploymentName_Gpt4oMini">GPT-4o Mini Deployment Name</Label>
                    <Input id="azureOpenAIGpt4DeploymentName_Gpt4oMini" name="azureOpenAIGpt4DeploymentName_Gpt4oMini" placeholder="Your GPT-4o Mini deployment name" value={config.azureOpenAIGpt4DeploymentName_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIEmbeddingDeploymentName_Gpt4oMini">Embedding Deployment Name</Label>
                    <Input id="azureOpenAIEmbeddingDeploymentName_Gpt4oMini" name="azureOpenAIEmbeddingDeploymentName_Gpt4oMini" placeholder="Your Embedding deployment name" value={config.azureOpenAIEmbeddingDeploymentName_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
            </div>
        </div>

        <Separator className="my-6" />

        <div>
            <h3 className="text-lg font-headline flex items-center mb-3"><Settings className="mr-2 h-5 w-5 text-primary/80" /> Azure OpenAI GPT-3.5-turbo Settings</h3>
            <div className="space-y-4 pl-2 border-l-2 border-primary/30 ml-1">
                <div>
                    <Label htmlFor="azureOpenAIApiKey_Gpt35Turbo">API Key</Label>
                    <Input id="azureOpenAIApiKey_Gpt35Turbo" name="azureOpenAIApiKey_Gpt35Turbo" type="password" placeholder="Azure OpenAI API Key" value={config.azureOpenAIApiKey_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiBaseUrl_Gpt35Turbo">API Base URL</Label>
                    <Input id="azureOpenAIApiBaseUrl_Gpt35Turbo" name="azureOpenAIApiBaseUrl_Gpt35Turbo" placeholder="e.g., https://your-resource.openai.azure.com" value={config.azureOpenAIApiBaseUrl_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                 <div>
                    <Label htmlFor="azureOpenAIApiVersion_Gpt35Turbo">API Version</Label>
                    <Input id="azureOpenAIApiVersion_Gpt35Turbo" name="azureOpenAIApiVersion_Gpt35Turbo" placeholder="e.g., 2023-03-15-preview" value={config.azureOpenAIApiVersion_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIGpt4DeploymentName_Gpt35Turbo">GPT-4 Deployment Name (Turbo context)</Label>
                    <Input id="azureOpenAIGpt4DeploymentName_Gpt35Turbo" name="azureOpenAIGpt4DeploymentName_Gpt35Turbo" placeholder="Optional GPT-4 deployment for Turbo" value={config.azureOpenAIGpt4DeploymentName_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIChatGptDeploymentName_Gpt35Turbo">Chat Deployment Name (Turbo)</Label>
                    <Input id="azureOpenAIChatGptDeploymentName_Gpt35Turbo" name="azureOpenAIChatGptDeploymentName_Gpt35Turbo" placeholder="Your GPT-3.5-Turbo deployment name" value={config.azureOpenAIChatGptDeploymentName_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
            </div>
        </div>


        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t">
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
              <Label htmlFor="import-config-input" className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" /> Import Config
                <Input id="import-config-input" type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </Label>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

