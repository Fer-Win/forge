import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const BASE =
  'press inline-flex min-h-tap items-center justify-center gap-2 rounded-full px-6 text-base font-bold select-none disabled:opacity-40 disabled:pointer-events-none';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white',
  secondary: 'bg-card-2 text-fg border border-hair',
  ghost: 'text-muted',
};

type Common = { variant?: Variant; className?: string; children: ReactNode };
type AsButton = Common & { href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>;
type AsLink = Common & { href: string } & { onClick?: () => void };

export function PillButton(props: AsButton | AsLink) {
  const { variant = 'primary', className = '', children } = props;
  const cls = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (props.href !== undefined) {
    return (
      <Link href={props.href} className={cls} onClick={props.onClick}>
        {children}
      </Link>
    );
  }
  const { variant: _v, className: _c, children: _ch, href: _h, ...rest } = props;
  void _v; void _c; void _ch; void _h;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
