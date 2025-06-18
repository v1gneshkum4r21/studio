
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

const API_CONFIG_STORAGE_KEY = 'excelFlowApiConfig'; // For local browser storage
const API_ENDPOINTS_STORAGE_KEY = 'excelFlowApiEndpoints'; // For API Doc definitions
const FASTAPI_BASE_URL = 'http://localhost:8000';

// Frontend state structure for API configurations
interface ApiConfig {
  openAIApiKey: string; // Legacy, potentially for direct OpenAI if ever needed by frontend
  azureApiKey: string;  // Legacy, potentially for direct Azure if ever needed by frontend

  // Azure GPT-4o-mini (Matches FastAPI ConfigUpdateRequest and GET response)
  azureOpenAIApiKey_Gpt4oMini: string;
  azureOpenAIApiBaseUrl_Gpt4oMini: string;
  azureOpenAIApiVersion_Gpt4oMini: string; // Only in GET, not POST /update
  azureOpenAIGpt4DeploymentName_Gpt4oMini: string;
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: string;

  // Azure GPT-3.5-Turbo (Matches FastAPI ConfigUpdateRequest and GET response)
  azureOpenAIApiKey_Gpt35Turbo: string;
  azureOpenAIApiBaseUrl_Gpt35Turbo: string;
  azureOpenAIApiVersion_Gpt35Turbo: string; // Only in GET, not POST /update
  azureOpenAIGpt4DeploymentName_Gpt35Turbo: string; // In FastAPI's AzureConfig but not ConfigUpdateRequest nor GET response for Turbo. Keeping UI field for now.
  azureOpenAIChatGptDeploymentName_Gpt35Turbo: string;
}

// Structure for FastAPI's /config/update endpoint (ConfigUpdateRequest model)
// Note: API Keys are SecretStr on backend, but strings from frontend.
interface BackendConfigUpdatePayload {
    OPENAI_API_KEY?: string;
    OPENAI_API_BASE_URL?: string;
    OPENAI_GPT4_DEPLOYMENT_NAME?: string;
    OPENAI_EMBEDDING_DEPLOYMENT_NAME?: string;
    // API Version is not part of the update payload for gpt4_mini

    OPENAI_API_KEY_TURBO?: string;
    OPENAI_API_BASE_URL_TURBO?: string;
    OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO?: string;
    // API Version is not part of the update payload for gpt35_turbo
}

// Structure expected from FastAPI's /config/get endpoint
interface BackendConfigGetResponse {
    OPENAI_API_KEY: string; // Masked as "*****"
    OPENAI_API_BASE_URL: string;
    OPENAI_API_VERSION: string;
    OPENAI_GPT4_DEPLOYMENT_NAME: string;
    OPENAI_EMBEDDING_DEPLOYMENT_NAME: string;

    OPENAI_API_KEY_TURBO: string; // Masked as "*****"
    OPENAI_API_BASE_URL_TURBO: string;
    OPENAI_API_VERSION_TURBO: string;
    OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO: string;
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
  azureApiKey: '',
  azureOpenAIApiKey_Gpt4oMini: '',
  azureOpenAIApiBaseUrl_Gpt4oMini: '',
  azureOpenAIApiVersion_Gpt4oMini: '2024-02-15-preview', // Default from FastAPI model
  azureOpenAIGpt4DeploymentName_Gpt4oMini: '',
  azureOpenAIEmbeddingDeploymentName_Gpt4oMini: '',
  azureOpenAIApiKey_Gpt35Turbo: '',
  azureOpenAIApiBaseUrl_Gpt35Turbo: '',
  azureOpenAIApiVersion_Gpt35Turbo: '2023-03-15-preview', // Default from FastAPI model
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

  // Maps frontend config to the structure FastAPI /config/update expects
  const mapToBackendConfigUpdate = (frontendConfig: ApiConfig): BackendConfigUpdatePayload => {
    const payload: BackendConfigUpdatePayload = {};
    // Only send if not empty, as FastAPI fields are Optional
    if (frontendConfig.azureOpenAIApiKey_Gpt4oMini) payload.OPENAI_API_KEY = frontendConfig.azureOpenAIApiKey_Gpt4oMini;
    if (frontendConfig.azureOpenAIApiBaseUrl_Gpt4oMini) payload.OPENAI_API_BASE_URL = frontendConfig.azureOpenAIApiBaseUrl_Gpt4oMini;
    if (frontendConfig.azureOpenAIGpt4DeploymentName_Gpt4oMini) payload.OPENAI_GPT4_DEPLOYMENT_NAME = frontendConfig.azureOpenAIGpt4DeploymentName_Gpt4oMini;
    if (frontendConfig.azureOpenAIEmbeddingDeploymentName_Gpt4oMini) payload.OPENAI_EMBEDDING_DEPLOYMENT_NAME = frontendConfig.azureOpenAIEmbeddingDeploymentName_Gpt4oMini;
    
    if (frontendConfig.azureOpenAIApiKey_Gpt35Turbo) payload.OPENAI_API_KEY_TURBO = frontendConfig.azureOpenAIApiKey_Gpt35Turbo;
    if (frontendConfig.azureOpenAIApiBaseUrl_Gpt35Turbo) payload.OPENAI_API_BASE_URL_TURBO = frontendConfig.azureOpenAIApiBaseUrl_Gpt35Turbo;
    if (frontendConfig.azureOpenAIChatGptDeploymentName_Gpt35Turbo) payload.OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO = frontendConfig.azureOpenAIChatGptDeploymentName_Gpt35Turbo;
    
    // API Versions are not part of the ConfigUpdateRequest in FastAPI
    return payload;
  };

  // Maps FastAPI /config/get response to frontend config structure
  const mapFromBackendConfigGetResponse = (backendData: BackendConfigGetResponse): Partial<ApiConfig> => {
    return {
        // For keys, if backend sends '*****', retain existing local value if present, else clear.
        // This prevents overwriting actual keys with masks unless explicitly cleared.
        azureOpenAIApiKey_Gpt4oMini: backendData.OPENAI_API_KEY === '*****' ? (config.azureOpenAIApiKey_Gpt4oMini || '') : backendData.OPENAI_API_KEY,
        azureOpenAIApiBaseUrl_Gpt4oMini: backendData.OPENAI_API_BASE_URL || '',
        azureOpenAIApiVersion_Gpt4oMini: backendData.OPENAI_API_VERSION || initialConfig.azureOpenAIApiVersion_Gpt4oMini,
        azureOpenAIGpt4DeploymentName_Gpt4oMini: backendData.OPENAI_GPT4_DEPLOYMENT_NAME || '',
        azureOpenAIEmbeddingDeploymentName_Gpt4oMini: backendData.OPENAI_EMBEDDING_DEPLOYMENT_NAME || '',
        
        azureOpenAIApiKey_Gpt35Turbo: backendData.OPENAI_API_KEY_TURBO === '*****' ? (config.azureOpenAIApiKey_Gpt35Turbo || '') : backendData.OPENAI_API_KEY_TURBO,
        azureOpenAIApiBaseUrl_Gpt35Turbo: backendData.OPENAI_API_BASE_URL_TURBO || '',
        azureOpenAIApiVersion_Gpt35Turbo: backendData.OPENAI_API_VERSION_TURBO || initialConfig.azureOpenAIApiVersion_Gpt35Turbo,
        azureOpenAIChatGptDeploymentName_Gpt35Turbo: backendData.OPENAI_CHATGPT_DEPLOYMENT_NAME_TURBO || '',
        // azureOpenAIGpt4DeploymentName_Gpt35Turbo is not in GET response
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
      const response = await fetch(`${FASTAPI_BASE_URL}${apiGetEndpoint.path}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({detail: "Failed to fetch server config"}));
        throw new Error(err.detail || `Failed to fetch config. Status: ${response.status}`);
      }
      const serverData: BackendConfigGetResponse = await response.json();
      const mappedConfig = mapFromBackendConfigGetResponse(serverData);
      
      setConfig(prev => {
          const newConfig = { ...prev, ...mappedConfig };
          // If keys came back masked, preserve local if it exists, otherwise use empty.
          if (serverData.OPENAI_API_KEY === '*****' && prev.azureOpenAIApiKey_Gpt4oMini) {
            newConfig.azureOpenAIApiKey_Gpt4oMini = prev.azureOpenAIApiKey_Gpt4oMini;
          } else if (serverData.OPENAI_API_KEY === '*****') {
            newConfig.azureOpenAIApiKey_Gpt4oMini = '';
          }
          if (serverData.OPENAI_API_KEY_TURBO === '*****' && prev.azureOpenAIApiKey_Gpt35Turbo) {
            newConfig.azureOpenAIApiKey_Gpt35Turbo = prev.azureOpenAIApiKey_Gpt35Turbo;
          } else if (serverData.OPENAI_API_KEY_TURBO === '*****') {
            newConfig.azureOpenAIApiKey_Gpt35Turbo = '';
          }
          localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
          return newConfig;
      });
      toast({ title: "Configuration Loaded from Server", description: "Settings synchronized with the server. API keys are masked if already set.", className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
      console.error("Error loading server config:", error);
      toast({ title: "Error Loading Server Config", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingServer(false);
    }
  }, [toast, config]); // config in dep array for mapFromBackendConfigGetResponse logic

  useEffect(() => {
    const storedConfig = localStorage.getItem(API_CONFIG_STORAGE_KEY);
    if (storedConfig) {
      try {
        const parsedConfig = JSON.parse(storedConfig);
        setConfig(prevConfig => ({ ...initialConfig, ...parsedConfig })); // Ensure all keys from initialConfig are present
      } catch (e) {
        console.error("Failed to parse stored API config", e);
        // Fallback to initial or load from server if local storage is corrupt
        loadConfigFromServer();
      }
    } else {
        loadConfigFromServer();
    }
  }, [loadConfigFromServer]); // loadConfigFromServer is memoized

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
    const backendPayload = mapToBackendConfigUpdate(config);

    try {
        const response = await fetch(`${FASTAPI_BASE_URL}${apiUpdateEndpoint.path}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(backendPayload)
        });
        if(!response.ok) {
            const errText = await response.text();
            let detail = "Failed to sync config to server";
            try {
                const errJson = JSON.parse(errText);
                detail = errJson.detail || detail;
            } catch {}
            throw new Error(detail + ` (Status: ${response.status})`);
        }
        const result = await response.json(); // Expects {"status": "updated", "updated_keys": [...]}
        toast({ title: "Configuration Synced to Server", description: `Updated keys on server: ${result.updated_keys.join(', ') || 'None'}. Refresh to see masked keys.`, className: "bg-accent text-accent-foreground" });
    } catch (error: any) {
        console.error("Error syncing config to server:", error);
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
        // Validation on server uses current server-side config, no payload needed
        const response = await fetch(`${FASTAPI_BASE_URL}${validateEndpoint.path}`, { method: 'POST' });
        if(!response.ok) {
            const err = await response.json().catch(() => ({detail: "Validation request failed"}));
            throw new Error(err.detail || `Validation request failed. Status: ${response.status}`);
        }
        const result = await response.json(); // Expects {"status": "valid" / "invalid", "details": {"gpt4_mini": {...}, "gpt35_turbo": {...}}}
        
        let validationMessages = [];
        if (result.details?.gpt4_mini) {
            validationMessages.push(`GPT-4o-mini (${result.details.gpt4_mini.deployment}): ${result.details.gpt4_mini.valid ? 'Valid' : 'Invalid'}`);
        }
        if (result.details?.gpt35_turbo) {
            validationMessages.push(`GPT-3.5-Turbo (${result.details.gpt35_turbo.deployment}): ${result.details.gpt35_turbo.valid ? 'Valid' : 'Invalid'}`);
        }
        
        if (result.status === "valid") {
            toast({ title: 'API Keys Validated', description: validationMessages.join('; ') || 'All configurations appear valid on the server.', className: 'bg-accent text-accent-foreground', duration: 7000 });
        } else {
             toast({ title: 'API Key Validation Issues', description: validationMessages.join('; ') || "Some server configurations are invalid.", variant: 'destructive', duration: 10000 });
        }

    } catch (error: any) {
         console.error("Validation error:", error);
         toast({ title: 'Validation Request Error', description: error.message, variant: 'destructive'});
    } finally {
        setIsValidating(false);
    }
  };

  const handleExportConfig = () => {
    // Export only the local config values, not server masks
    const exportableConfig = { ...config };
    // If API keys are empty and were masked, don't export empty strings if original was masked.
    // This depends on whether you want to export the "knowledge" of a masked key.
    // For simplicity, just export current state.
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportableConfig))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "excelFlow_api_config_local.json";
    link.click();
    toast({ title: "Local Configuration Exported", description: "excelFlow_api_config_local.json downloaded."});
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedString = e.target?.result as string;
          const importedData = JSON.parse(importedString);
          
          // Validate and merge with initialConfig to ensure all keys are present
          const newConfig = { ...initialConfig }; // Start with defaults
          for (const key in newConfig) {
            if (key in importedData && typeof importedData[key] === typeof newConfig[key as keyof ApiConfig]) {
              (newConfig as any)[key] = importedData[key];
            }
          }
          setConfig(newConfig);
          localStorage.setItem(API_CONFIG_STORAGE_KEY, JSON.stringify(newConfig)); // Also update local storage
          toast({ title: "Configuration Imported", description: "Settings loaded from file. Save to local or sync to server to persist.", className: "bg-accent text-accent-foreground" });
        } catch (error) {
          console.error("Import error:", error);
          toast({ title: "Import Failed", description: "Invalid configuration file format.", variant: "destructive" });
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
          Configure API keys. Settings are stored locally and can be synced with the server. Ensure FastAPI is running with CORS. Server may mask keys on GET.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="bg-primary/10 border-primary/30">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">Configuration Source &amp; API Docs</AlertTitle>
          <AlertDescription>
            Local settings are saved in your browser. Use 'Sync to Server' to update backend, 'Load from Server' to fetch. Validation checks server-side config. Endpoints like '/config/get', '/config/update', '/config/validate' must be defined in API Docs.
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
                    <Label htmlFor="azureOpenAIApiKey_Gpt4oMini">API Key (Gpt4oMini)</Label>
                    <Input id="azureOpenAIApiKey_Gpt4oMini" name="azureOpenAIApiKey_Gpt4oMini" type="password" placeholder="Azure OpenAI API Key for GPT-4o-mini" value={config.azureOpenAIApiKey_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiBaseUrl_Gpt4oMini">API Base URL (Gpt4oMini)</Label>
                    <Input id="azureOpenAIApiBaseUrl_Gpt4oMini" name="azureOpenAIApiBaseUrl_Gpt4oMini" placeholder="e.g., https://your-resource.openai.azure.com" value={config.azureOpenAIApiBaseUrl_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiVersion_Gpt4oMini">API Version (Gpt4oMini - from server)</Label>
                    <Input id="azureOpenAIApiVersion_Gpt4oMini" name="azureOpenAIApiVersion_Gpt4oMini" placeholder="e.g., 2024-02-15-preview" value={config.azureOpenAIApiVersion_Gpt4oMini} onChange={handleInputChange} className="mt-1" disabled title="This value is typically set by the server."/>
                </div>
                <div>
                    <Label htmlFor="azureOpenAIGpt4DeploymentName_Gpt4oMini">GPT-4o Mini Deployment Name</Label>
                    <Input id="azureOpenAIGpt4DeploymentName_Gpt4oMini" name="azureOpenAIGpt4DeploymentName_Gpt4oMini" placeholder="Your GPT-4o Mini deployment name" value={config.azureOpenAIGpt4DeploymentName_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIEmbeddingDeploymentName_Gpt4oMini">Embedding Deployment Name (Gpt4oMini)</Label>
                    <Input id="azureOpenAIEmbeddingDeploymentName_Gpt4oMini" name="azureOpenAIEmbeddingDeploymentName_Gpt4oMini" placeholder="Your Embedding deployment name for Gpt4oMini" value={config.azureOpenAIEmbeddingDeploymentName_Gpt4oMini} onChange={handleInputChange} className="mt-1" />
                </div>
            </div>
        </div>

        <Separator className="my-6" />

        <div>
            <h3 className="text-lg font-headline flex items-center mb-3"><Settings className="mr-2 h-5 w-5 text-primary/80" /> Azure OpenAI GPT-3.5-turbo Settings</h3>
            <div className="space-y-4 pl-2 border-l-2 border-primary/30 ml-1">
                <div>
                    <Label htmlFor="azureOpenAIApiKey_Gpt35Turbo">API Key (GPT-3.5-Turbo)</Label>
                    <Input id="azureOpenAIApiKey_Gpt35Turbo" name="azureOpenAIApiKey_Gpt35Turbo" type="password" placeholder="Azure OpenAI API Key for GPT-3.5-turbo" value={config.azureOpenAIApiKey_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="azureOpenAIApiBaseUrl_Gpt35Turbo">API Base URL (GPT-3.5-Turbo)</Label>
                    <Input id="azureOpenAIApiBaseUrl_Gpt35Turbo" name="azureOpenAIApiBaseUrl_Gpt35Turbo" placeholder="e.g., https://your-resource.openai.azure.com" value={config.azureOpenAIApiBaseUrl_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
                </div>
                 <div>
                    <Label htmlFor="azureOpenAIApiVersion_Gpt35Turbo">API Version (GPT-3.5-Turbo - from server)</Label>
                    <Input id="azureOpenAIApiVersion_Gpt35Turbo" name="azureOpenAIApiVersion_Gpt35Turbo" placeholder="e.g., 2023-03-15-preview" value={config.azureOpenAIApiVersion_Gpt35Turbo} onChange={handleInputChange} className="mt-1" disabled title="This value is typically set by the server."/>
                </div>
                <div>
                    <Label htmlFor="azureOpenAIGpt4DeploymentName_Gpt35Turbo">GPT-4 Deployment Name (Associated with Turbo - Optional, not in server update/get)</Label>
                    <Input id="azureOpenAIGpt4DeploymentName_Gpt35Turbo" name="azureOpenAIGpt4DeploymentName_Gpt35Turbo" placeholder="Optional related GPT-4 deployment" value={config.azureOpenAIGpt4DeploymentName_Gpt35Turbo} onChange={handleInputChange} className="mt-1" />
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
            {isValidating ? 'Validating...' : 'Validate Server Config'}
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
              <Label htmlFor="import-config-input" className="cursor-pointer flex items-center justify-center h-10">
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
