import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 placeholder:text-slate-400 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:border-slate-400 transition-colors",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
