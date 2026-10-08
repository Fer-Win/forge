import { TabBar } from '@/components/TabBar';

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md px-4" style={{ paddingTop: 'calc(var(--safe-top) + 16px)', paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 24px)' }}>
      {children}
      <TabBar />
    </div>
  );
}
