import AppLayout from '@/components/layout/AppLayout';
import AccuracyChecker from '@/components/excel-flow/AccuracyChecker';

export default function AccuracyPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
         <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">AI Accuracy Comparison</h1>
          <p className="text-muted-foreground">Compare manually created JSON with AI-generated JSON to assess semantic accuracy.</p>
        </div>
        <AccuracyChecker />
      </div>
    </AppLayout>
  );
}
