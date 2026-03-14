type PageOctopusDecorProps = {
  className?: string;
};

export function PageOctopusDecor({ className = "" }: PageOctopusDecorProps) {
  return (
    <img
      src="/main.png"
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      fetchPriority="low"
      className={`pointer-events-none select-none absolute left-1/2 -top-8 -translate-x-1/2 z-0 hidden xl:block w-[min(96vw,1500px)] max-w-none opacity-[0.74] ${className}`}
    />
  );
}
