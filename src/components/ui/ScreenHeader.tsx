export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header>
      {subtitle && <p className="text-sm font-medium text-muted">{subtitle}</p>}
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
    </header>
  );
}
