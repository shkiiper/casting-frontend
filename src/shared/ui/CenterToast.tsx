type CenterToastProps = {
  message: string;
};

export function CenterToast({ message }: CenterToastProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none px-4">
      <div className="glass-object-soft rounded-2xl border border-emerald-200/70 bg-emerald-50/85 px-6 py-4 text-emerald-800 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        {message}
      </div>
    </div>
  );
}
