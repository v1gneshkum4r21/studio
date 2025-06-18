import AppLayout from '@/components/layout/AppLayout';
import ApiSettings from '@/components/excel-flow/ApiSettings';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">API Configuration &amp; Settings</h1>
          <p className="text-muted-foreground">Manage API keys and other application settings.</p>
        </div>
        <ApiSettings />
      </div>
    </AppLayout>
  );
}
