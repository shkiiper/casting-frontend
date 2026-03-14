import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
  }
>;

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button 
      className={cn(
        'glass px-6 py-3 rounded-xl font-medium shadow-md',
        variant === 'primary' && 'bg-gradient-to-r from-[hsl(var(--accent))] to-black text-white',
        variant === 'secondary' && 'border border-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.05)]'
      )}
      {...props}
    />
  );
}
