import { demoUrl } from '@/lib/demo';

export function DemoLink({ name }: { name: string }) {
  return (
    <a
      href={demoUrl(name)}
      target="_blank"
      rel="noopener noreferrer"
      className="press flex min-h-tap w-full items-center justify-center gap-2 rounded-full border border-hair bg-card-2 px-6 font-bold"
    >
      Watch how <span aria-hidden>↗</span>
      <span className="sr-only">(opens a video search in a new tab, needs internet)</span>
    </a>
  );
}
