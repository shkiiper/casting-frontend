import React from "react";
import { cn } from "@/lib/utils";

type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  onChange?: (value: string) => void;
};

export const Input = ({
  className,
  onChange,
  ...props
}: InputProps) => {
  return (
    <input
      {...props}
      className={cn(
        `
        w-full rounded-2xl border border-slate-200 px-4 py-3
        text-slate-900 placeholder:text-slate-400
        bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]
        focus:outline-none focus:ring-2 focus:ring-slate-900/30 focus:border-slate-400
        transition-colors
        `,
        className
      )}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
};
