import type { PropsWithChildren } from 'react';

type CardProps = PropsWithChildren<{ className?: string }>;

export function Card({ children, className }: CardProps) {
  return <div className={className}>{children}</div>;
}

export function CardHeader({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>;
}

export function CardContent({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={className}>{children}</div>;
}
