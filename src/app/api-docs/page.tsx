
'use client';

import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Network } from 'lucide-react';

interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}

const configApis: ApiEndpoint[] = [
  { path: '/config/get', method: 'GET', description: 'Fetch the current configuration values (e.g., API keys, base URLs, deployment names).' },
  { path: '/config/update', method: 'POST', description: 'Update configuration values dynamically via JSON (e.g., OpenAI keys, base URLs).' },
  { path: '/config/reset', method: 'POST', description: '(Optional) Reset configuration to default values from backup or template.' },
  { path: '/config/validate', method: 'POST', description: '(Optional) Validate the current configuration by pinging the OpenAI/Azure API.' },
];

const downloadApis: ApiEndpoint[] = [
  { path: '/download/zip/<run_id>', method: 'GET', description: 'Returns a ZIP file containing all filled Excel files for a run.' },
  { path: '/download/<run_id>/<filename>', method: 'GET', description: 'Download any output file (Excel, JSON, etc.) by run and name.' },
];

const templateApis: ApiEndpoint[] = [
  { path: '/template/upload', method: 'POST', description: 'Upload one or more template Excel files for onboarding.' },
  { path: '/template/delete', method: 'DELETE', description: 'Delete a specific or all uploaded template files.' },
  { path: '/template/list', method: 'GET', description: 'Retrieve a list of all uploaded template files.' },
];

const vendorApis: ApiEndpoint[] = [
  { path: '/vendor/upload', method: 'POST', description: 'Upload one or more vendor master Excel files.' },
  { path: '/vendor/delete', method: 'DELETE', description: 'Delete a specific or all uploaded vendor files.' },
  { path: '/vendor/list', method: 'GET', description: 'Retrieve a list of all uploaded vendor files.' },
];

const processApis: ApiEndpoint[] = [
  { path: '/process', method: 'POST', description: 'Trigger the onboarding pipeline to process uploaded files.' },
  { path: '/status/<run_id>', method: 'GET', description: 'Get the real-time processing status of a given run.' },
  { path: '/results/<run_id>', method: 'GET', description: 'Retrieve results metadata and generated output file paths.' },
];

const utilityApis: ApiEndpoint[] = [
  { path: '/clear_temp', method: 'POST', description: 'Clear temporary or intermediate pipeline data.' },
  { path: '/compare', method: 'POST', description: 'Compare manual vs AI-filled form JSONs and calculate accuracy.' },
  { path: '/report', method: 'POST', description: 'Generate a PDF report based on comparison and accuracy insights.' },
];

const ApiSection = ({ title, endpoints }: { title: string, endpoints: ApiEndpoint[] }) => (
  <Card className="shadow-md">
    <CardHeader>
      <CardTitle className="font-headline text-xl">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Method</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((api) => (
            <TableRow key={api.path}>
              <TableCell>
                <Badge
                  variant={
                    api.method === 'DELETE' ? 'destructive' : 'default'
                  }
                  className={
                    api.method === 'GET' ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''
                  }
                >
                  {api.method}
                </Badge>
              </TableCell>
              <TableCell className="font-code">{api.path}</TableCell>
              <TableCell>{api.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);


export default function ApiDocsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Network className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">API Documentation</h1>
            <p className="text-muted-foreground">Reference for available REST API endpoints.</p>
          </div>
        </div>
        
        <ApiSection title="Configuration API" endpoints={configApis} />
        <ApiSection title="Download API" endpoints={downloadApis} />
        <ApiSection title="Template File API" endpoints={templateApis} />
        <ApiSection title="Vendor File API" endpoints={vendorApis} />
        <ApiSection title="Processing API" endpoints={processApis} />
        <ApiSection title="Utility API" endpoints={utilityApis} />
        
      </div>
    </AppLayout>
  );
}
