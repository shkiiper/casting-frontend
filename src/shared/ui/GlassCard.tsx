import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'bg-[hsl(var(--glass))] border border-white/20 shadow-xl rounded-2xl p-8',
      className
    )}>
      {children}
    </div>
  );
}
