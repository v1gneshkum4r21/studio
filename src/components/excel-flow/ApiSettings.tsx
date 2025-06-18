
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, KeyRound, CheckCircle, AlertTriangle, Loader2, Upload, Download, Settings, CloudUpload, CloudDownload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';

const API_CONFIG_STORAGE_KEY = 'excelFlowApiConfig';
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints';

interface ApiConfig {
  openAIApiKey: string; // Stays as string for input, backend SecretStr handles it
  azureApiKey: string;

  azureOpenAIApiKey_Gpt4oMini: string;
  azureOpenAIApiBaseUrl_Gpt4oMini: string;
  azureOpenAIApiVersion_Gpt4oMini: string;
  azureOpenAIGpt4DeploymentName_Gpt4oMini: string;
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: string;

  azureOpenAIApiKey_Gpt35Turbo: string;
  azureOpenAIApiBaseUrl_Gpt35Turbo: string;
  azureOpenAIGpt4DeploymentName_Gpt35Turbo: string; // This was in your FastAPI, maybe legacy or for specific models
  azureOpenAIChatGptDeploymentName_Gpt35Turbo: string; // Actual deployment for 3.5 turbo
  azureOpenAIApiVersion_Gpt35Turbo: string;
}

// For FastAPI /config/update and /config/get interactions
// Note: FastAPI's ConfigUpdateRequest uses SecretStr for API keys.
// When sending from frontend, they will be strings. Pydantic handles conversion.
interface BackendConfig {
    OPENAI_API_KEY?: string;
    OPENAI_API_BASE_URL?: string;
    OPENAI_API_VERSION?: string;
    OPENAI_GPT4_DEPLOYMENT_NAME?: string;
    OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string;
    OPENAI_API_KEY_TURBO?: string;
    OPENAI_API_BASE_URL_TURBO?: string;
    OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO?: string;
    OPENAI_API_VERSION_TURBO?: string;
}


interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}

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
  azureApiKey: '', // This isn't directly in your FastAPI config model but keeping it for now
  azureOpenAIApiKey_Gpt4oMini: '',
  azureOpenAIApiBaseUrl_Gpt4oMini: '',
  azureOpenAIApiVersion_Gpt4oMini: '',
  azureOpenAIGpt4DeploymentName_Gpt4oMini: '',
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: '',
  azureOpenAIApiKey_Gpt35Turbo: '',
  azureOpenAIApiBaseUrl_Gpt35Turbo: '',
  azureOpenAIApiVersion_Gpt35Turbo: '',
  azureOpenAIGpt4DeploymentName_Gpt35Turbo: '',
  azureOpenAIChatGptDeploymentName_Gpt35Turbo: '',
};

export default function ApiSettings() {
  const [config, setConfig] = useState<ApiConfig>(initialConfig);
  const [isSavingLocal, setIsSavingLocal] = useState<boolean>(false);
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [isLoadingServer, setIsLoadingServer] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const { toast } = useToast();

  const mapToBackendConfig = (frontendConfig: ApiConfig): BackendConfig => {
    return {
        OPENAI_API_KEY: frontendConfig.azureOpenAIApiKey_Gpt4oMini || undefined, // Use Azure ones
        OPENAI_API_BASE_URL: frontendConfig.azureOpenAIApiBaseUrl_Gpt4oMini || undefined,
        OPENAI_API_VERSION: frontendConfig.azureOpenAIApiVersion_Gpt4oMini || undefined, // Not in FastAPI update model
        OPENAI_GPT4_DEPLOYMENT_NAME: frontendConfig.azureOpenAIGpt4DeploymentName_Gpt4oMini || undefined,
        OPENAI_EMBEDDING_DEPLOYMENT_NAME: frontendConfig.azureOpenAIEmbeddingDeploymentName_Gpt4oMini || undefined,
        OPENAI_API_KEY_TURBO: frontendConfig.azureOpenAIApiKey_Gpt35Turbo || undefined,
        OPENAI_API_BASE_URL_TURBO: frontendConfig.azureOpenAIApiBaseUrl_Gpt35Turbo || undefined,
        OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO: frontendConfig.azureOpenAIChatGptDeploymentName_Gpt35Turbo || undefined,
        OPENAI_API_VERSION_TURBO: frontendConfig.azureOpenAIApiVersion_Gpt35Turbo || undefined, // Not in FastAPI update model
    };
  };

  const mapFromBackendConfig = (backendConfig: BackendConfig): Partial<ApiConfig> => {
    return {
        azureOpenAIApiKey_Gpt4oMini: backendConfig.OPENAI_API_KEY || '',
        azureOpenAIApiBaseUrl_Gpt4oMini: backendConfig.OPENAI_API_BASE_URL || '',
        azureOpenAIApiVersion_Gpt4oMini: backendConfig.OPENAI_API_VERSION || initialConfig.azureOpenAIApiVersion_Gpt4oMini,
        azureOpenAIGpt4DeploymentName_Gpt4oMini: backendConfig.OPENAI_GPT4_DEPLOYMENT_NAME || '',
        azureOpenAIEmbeddingDeploymentName_Gpt4oMini: backendConfig.OPENAI_EMBEDDING_DEPLOYMENT_NAME || '',
        
        azureOpenAIApiKey_Gpt35Turbo: backendConfig.OPENAI_API_KEY_TURBO || '',
        azureOpenAIApiBaseUrl_Gpt35Turbo: backendConfig.OPENAI_API_BASE_URL_TURBO || '',
        azureOpenAIGpt4DeploymentName_Gpt35Turbo: '', // Not in GET response
        azureOpenAIChatGptDeploymentName_Gpt35Turbo: backendConfig.OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO || '',
        azureOpenAIApiVersion_Gpt35Turbo: backendConfig.OPENAI_API_VERSION_TURBO || initialConfig.azureOpenAIApiVersion_Gpt35Turbo,
    };
  };

  const loadConfigFromServer = useCallback(async () => {
    const apiGetEndpoint = getApiEndpoint('/config/get', 'GET');
    if (!apiGetEndpoint) {
      toast({ title: "Cannot Load Server Config", description: "'/config/get' (GET) endpoint not defined in API Docs.", variant: "destructive" });
      return;
    }
    setIsLoadingServer(true);
    try {
      const response = await fetch(`http://localhost:8000${apiGetEndpoint.path}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({detail: "Failed to fetch server config"}));
        throw new Error(err.detail);
      }
      const serverData = await response.json();
      const mappedConfig = mapFromBackendConfig(serverData);
      setConfig(prev => ({ ...prev, ...mappedConfig }));
      localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify({ ...config, ...mappedConfig })); // Also update local
      toast({ title: "Configuration Loaded from Server", description: "Settings synchronized with the server.", className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      toast({ title: "Error Loading Server Config", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingServer(false);
    }
  }, [toast, config]); // Added config to dependency array

  useEffect(() => {
    const storedConfig = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig(prevConfig => ({ ...prevConfig, ...parsedConfig }));
      } catch (e) {
        console.error("Failed to parse stored API config", e);
      }
    } else {
        // If no local config, try loading from server on initial mount
        loadConfigFromServer();
    }
  }, [loadConfigFromServer]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prevConfig) => ({ ...prevConfig, [name]: value }));
  };

  const handleSaveConfigLocal = () => {
    setIsSavingLocal(true);
    try {
      localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(config));
      toast({
        title: 'Settings Saved Locally',
        description: 'Your API configurations have been saved in your browser.',
        variant: 'default',
        className: 'bg-accent text-accent-foreground',
      });
    } catch (error) {
       toast({
        title: 'Error Saving Settings Locally',
        description: 'Could not save API settings to local storage.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleSyncConfigToServer = async () => {
    const apiUpdateEndpoint = getApiEndpoint('/config/update', 'POST');
    if (!apiUpdateEndpoint) {
      toast({ title: "Cannot Sync Config", description: "'/config/update' (POST) endpoint not defined in API Docs.", variant: "destructive" });
      return;
    }
    setIsSyncingServer(true);
    const backendPayload = mapToBackendConfig(config);

    // Filter out undefined values from payload for cleaner request
    const filteredPayload = Object.fromEntries(Object.entries(backendPayload).filter(([_, v]) => v !== undefined));

    try {
        const response = await fetch(`http://localhost:8000${apiUpdateEndpoint.path}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(filteredPayload)
        });
        if(!response.ok) {
            const err = await response.json().catch(() => ({detail: "Failed to sync config to server"}));
            throw new Error(err.detail);
        }
        const result = await response.json();
        toast({ title: "Configuration Synced to Server", description: `Updated keys: ${result.updated_keys.join(', ')}`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
        toast({ title: "Error Syncing Config to Server", description: error.message, variant: "destructive" });
    } finally {
        setIsSyncingServer(false);
    }
  };
  
  const handleValidateKeys = async () => {
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
    try {
        const response = await fetch(`http://localhost:8000${validateEndpoint.path}`, { method: 'POST' });
        if(!response.ok) {
            const err = await response.json().catch(() => ({detail: "Validation request failed"}));
            throw new Error(err.detail);
        }
        const result = await response.json();
        let validationMessages = [];
        if (result.details?.gpt4_mini) {
            validationMessages.push(`GPT-4o-mini (${result.details.gpt4_mini.deployment}): ${result.details.gpt4_mini.valid ? 'Valid' : 'Invalid'}`);
        }
        if (result.details?.gpt35_turbo) {
            validationMessages.push(`GPT-3.5-Turbo (${result.details.gpt35_turbo.deployment}): ${result.details.gpt35_turbo.valid ? 'Valid' : 'Invalid'}`);
        }
        
        if (result.status === "valid") {
            toast({ title: 'API Keys Validated', description: validationMessages.join('; '), className: 'bg-accent text-accent-foreground', duration: 7000 });
        } else {
             toast({ title: 'API Key Validation Issues', description: validationMessages.join('; ') || "Some configurations are invalid.", variant: 'destructive', duration: 7000 });
        }

    } catch (error: any) {
         toast({ title: 'Validation Request Error', description: error.message, variant: 'destructive'});
    } finally {
        setIsValidating(false);
    }
  };

  const handleExportConfig = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(config))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "excelFlow_api_config.json";
    link.click();
    toast({ title: "Local Configuration Exported", description: "excelFlow_api_config.json downloaded."});
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig = JSON.parse(e.target?.result as string);
          if (typeof importedConfig === 'object' && importedConfig !== null) {
            // Validate imported keys against ApiConfig structure somewhat
            const newConfig = {...initialConfig}; // Start with initial to ensure all keys exist
            for (const key in newConfig) {
                if (key in importedConfig && typeof importedConfig[key] === typeof newConfig[key as keyof ApiConfig]) {
                    (newConfig as any)[key] = importedConfig[key];
                }
            }
            setConfig(newConfig);
            toast({ title: "Configuration Imported to Local", description: "Settings loaded from file. Save or Sync to server.", className: "bg-accent text-accent-foreground" });
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
        event.target.value = ""; // Reset file input
    }
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center">
          <KeyRound className="mr-2 h-6 w-6 text-primary" /> API Key Management
        </CardTitle>
        <CardDescription>
          Configure API keys. Settings are stored locally and can be synced with the server. Ensure FastAPI is running with CORS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Configuration Source &amp; API Docs</AlertTitle>
          <AlertDescription>
            Settings are primarily managed in your browser (local storage). Use 'Sync to Server' to update backend, 'Load from Server' to fetch. Validation uses endpoints from API Docs (e.g., '/config/validate', '/config/get', '/config/update').
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label htmlFor="openAIApiKey" className="text-base font-semibold">Legacy OpenAI API Key (Not used by current FastAPI)</Label>
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
            <Label htmlFor="azureApiKey" className="text-base font-semibold">Legacy Azure API Key (Not used by current FastAPI)</Label>
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
                    <Input id="azureOpenAIApiKey_Gpt4oMini" name="azureOpenAIApiKey_Gpt4oMini" type="password" placeholder="Azure OpenAI API Key for GPT-4o-mini" value={config.azureOpenAIApiKey_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
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
                    <Input id="azureOpenAIApiKey_Gpt35Turbo" name="azureOpenAIApiKey_Gpt35Turbo" type="password" placeholder="Azure OpenAI API Key for GPT-3.5-turbo" value={config.azureOpenAIApiKey_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
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
                    <Label htmlFor="azureOpenAIGpt4DeploymentName_Gpt35Turbo">GPT-4 Deployment Name (Context for Turbo - Optional, Not in GET)</Label>
                    <Input id="azureOpenAIGpt4DeploymentName_Gpt35Turbo" name="azureOpenAIGpt4DeploymentName_Gpt35Turbo" placeholder="Optional GPT-4 deployment for Turbo context" value={config.azureOpenAIGpt4DeploymentName_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIChatGptDeploymentName_Gpt35Turbo">Chat Deployment Name (GPT-3.5-Turbo)</Label>
                    <Input id="azureOpenAIChatGptDeploymentName_Gpt35Turbo" name="azureOpenAIChatGptDeploymentName_Gpt35Turbo" placeholder="Your GPT-3.5-Turbo deployment name" value={config.azureOpenAIChatGptDeploymentName_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handleValidateKeys} disabled={isValidating || isSavingLocal || isSyncingServer || isLoadingServer} className="w-full">
            {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {isValidating ? 'Validating...' : 'Validate Keys with Server'}
          </Button>
          <Button onClick={handleSaveConfigLocal} disabled={isSavingLocal || isSyncingServer || isLoadingServer || isValidating} className="w-full">
            {isSavingLocal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSavingLocal ? 'Saving Locally...' : 'Save to Local Browser'}
          </Button>
           <Button onClick={handleSyncConfigToServer} disabled={isSyncingServer || isSavingLocal || isLoadingServer || isValidating} className="w-full">
            {isSyncingServer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
            {isSyncingServer ? 'Syncing...' : 'Sync to Server'}
          </Button>
        </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 border-t pt-4">
            <Button variant="outline" onClick={handleExportConfig} className="w-full">
                <Download className="mr-2 h-4 w-4" /> Export Local Config
            </Button>
            <Button variant="outline" asChild className="w-full cursor-pointer">
              <Label htmlFor="import-config-input" className="cursor-pointer flex items-center justify-center h-10"> {/* Ensure Label takes full button height and centers content */}
                <Upload className="mr-2 h-4 w-4" /> Import to Local Config
                <Input id="import-config-input" type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
              </Label>
            </Button>
             <Button variant="outline" onClick={loadConfigFromServer} disabled={isLoadingServer || isSyncingServer || isSavingLocal || isValidating} className="w-full">
                {isLoadingServer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CloudDownload className="mr-2 h-4 w-4" />}
                {isLoadingServer ? 'Loading...' : 'Load from Server'}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
