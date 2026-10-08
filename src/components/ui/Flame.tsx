export function Flame({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12.6 2.2c.3 2.6-.9 4.2-2.3 5.8C8.8 9.7 7 11.5 7 14.4 7 17.5 9.2 20 12 20s5-2.5 5-5.6c0-1.9-.8-3.2-1.6-4.3-.3 1.1-1 1.9-1.9 2.2.5-3.6-.1-7.5-.9-10.1z" />
    </svg>
  );
}
