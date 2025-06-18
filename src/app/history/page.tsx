import AppLayout from '@/components/layout/AppLayout';
import RunHistoryList from '@/components/excel-flow/RunHistoryList';

export default function HistoryPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Run History &amp; Archives</h1>
          <p className="text-muted-foreground">View past processing runs and download their associated files.</p>
        </div>
        <RunHistoryList />
      </div>
    </AppLayout>
  );
}
