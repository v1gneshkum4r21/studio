
'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Network, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'DELETE';
  description: string;
}

export default function ApiDocsPage() {
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [newApiPath, setNewApiPath] = useState('');
  const [newApiMethod, setNewApiMethod] = useState<'GET' | 'POST' | 'DELETE'>('GET');
  const [newApiDescription, setNewApiDescription] = useState('');
  const { toast } = useToast();

  const handleAddEndpoint = () => {
    if (!newApiPath.trim() || !newApiDescription.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Path and Description cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const newEndpoint: ApiEndpoint = {
      id: Date.now().toString() + Math.random().toString(36).substring(2), // Simple unique ID
      path: newApiPath,
      method: newApiMethod,
      description: newApiDescription,
    };

    setApiEndpoints((prevEndpoints) => [...prevEndpoints, newEndpoint]);
    setNewApiPath('');
    // setNewApiMethod('GET'); // Optionally reset method or keep last used
    setNewApiDescription('');
    toast({
      title: 'API Endpoint Added',
      description: `Endpoint "${newEndpoint.path}" has been added.`,
      variant: 'default',
      className: 'bg-accent text-accent-foreground'
    });
  };

  const handleRemoveEndpoint = (id: string) => {
    const endpointToRemove = apiEndpoints.find(ep => ep.id === id);
    setApiEndpoints((prevEndpoints) => prevEndpoints.filter((endpoint) => endpoint.id !== id));
    if (endpointToRemove) {
      toast({
        title: 'API Endpoint Removed',
        description: `Endpoint "${endpointToRemove.path}" has been removed.`,
        variant: 'default',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center space-x-3 mb-6">
          <Network className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Live API Endpoint Editor</h1>
            <p className="text-muted-foreground">Add, view, and manage your API endpoint definitions dynamically.</p>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Add New API Endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="api-path">Path</Label>
                <Input
                  id="api-path"
                  value={newApiPath}
                  onChange={(e) => setNewApiPath(e.target.value)}
                  placeholder="/example/resource"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="api-method">Method</Label>
                <Select value={newApiMethod} onValueChange={(value) => setNewApiMethod(value as 'GET' | 'POST' | 'DELETE')}>
                  <SelectTrigger id="api-method" className="mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
               <div className="md:col-span-3">
                <Label htmlFor="api-description">Description</Label>
                <Textarea
                  id="api-description"
                  value={newApiDescription}
                  onChange={(e) => setNewApiDescription(e.target.value)}
                  placeholder="Describes what this endpoint does."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddEndpoint}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Endpoint
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl">Defined API Endpoints</CardTitle>
            {apiEndpoints.length === 0 && (
              <CardDescription>No API endpoints defined yet. Add one using the form above.</CardDescription>
            )}
          </CardHeader>
          {apiEndpoints.length > 0 && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiEndpoints.map((api) => (
                    <TableRow key={api.id}>
                      <TableCell>
                        <Badge
                          variant={
                            api.method === 'DELETE' ? 'destructive' : 'default'
                          }
                          className={
                            api.method === 'GET' ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                            : api.method === 'POST' ? 'bg-primary/80 text-primary-foreground hover:bg-primary/70'
                            : ''
                          }
                        >
                          {api.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-code">{api.path}</TableCell>
                      <TableCell>{api.description}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveEndpoint(api.id)} aria-label="Remove endpoint">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
