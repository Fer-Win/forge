import { ScreenHeader } from '@/components/ui/ScreenHeader';

export default function Page() {
  return (
    <main>
      <ScreenHeader title="Today" subtitle="What's next" />
      <div className="mt-6 rounded-card border border-hair bg-card p-5 text-muted">Coming in a later phase.</div>
    </main>
  );
}
