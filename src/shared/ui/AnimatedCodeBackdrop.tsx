import { useEffect, useMemo, useRef } from "react";

const codeBackdropRows = [
  "++==---::==++**##**++==---::==++**##**++==---::==++",
  "...::==++***###%%###***++==::...::==++***###%%###***",
  "==++**##++==---::::---==++**##**++==---::::---==++**",
  "##**++==::..::==++**##%%##**++==::..::==++**##%%##**",
  "::---==++**##**++==---::---==++**##**++==---::---==",
  "++**##%%##**++==---::::---==++**##%%##**++==---::::",
  "---::==++**##**++==---::==++**##**++==---::==++**##",
  "***###%%###***++==::...::==++***###%%###***++==::...",
  "==---::::---==++**##**++==---::::---==++**##**++==--",
  "::..::==++**##%%##**++==::..::==++**##%%##**++==::.",
  "++==---::---==++**##**++==---::---==++**##**++==---",
  "##**++==---::::---==++**##%%##**++==---::::---==++*",
];

const codeBackdropAlphabets = [
  "+=-:.#*%",
  "::-=+*#%",
  "++==--::..**##",
  "##**++==::--%%",
];

const createCodeBackdropRow = (index: number, step: number) => {
  const baseRow = codeBackdropRows[(index + step) % codeBackdropRows.length];
  const alphabet = codeBackdropAlphabets[(index + step) % codeBackdropAlphabets.length];
  const shiftedRow = baseRow.replace(/[+=\-:.#*%]/g, (char, charIndex) => {
    const nextIndex = (alphabet.indexOf(char) + index + step + charIndex) % alphabet.length;
    return alphabet[nextIndex < 0 ? 0 : nextIndex];
  });

  return `${shiftedRow}::${baseRow}--${shiftedRow}::${baseRow}--${shiftedRow}`;
};

const createCodeBackdropPattern = (step: number) =>
  Array.from({ length: 260 }, (_, index) => createCodeBackdropRow(index, step));

type AnimatedCodeBackdropProps = {
  className?: string;
};

export function AnimatedCodeBackdrop({ className = "" }: AnimatedCodeBackdropProps) {
  const codeBackdropRef = useRef<HTMLDivElement | null>(null);
  const codeBackdropPattern = useMemo(() => createCodeBackdropPattern(0), []);

  useEffect(() => {
    document.body.classList.add("has-code-backdrop");
    return () => document.body.classList.remove("has-code-backdrop");
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      return undefined;
    }

    let step = 0;
    const rowElements = Array.from(
      codeBackdropRef.current?.querySelectorAll<HTMLSpanElement>("span") ?? []
    );

    const intervalId = window.setInterval(() => {
      step = (step + 1) % 48;

      rowElements.forEach((rowElement, index) => {
        rowElement.textContent = createCodeBackdropRow(index, step);
      });
    }, 110);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div
      ref={codeBackdropRef}
      className={`home-page-code-backdrop ${className}`}
      aria-hidden="true"
    >
      {codeBackdropPattern.map((row, index) => (
        <span key={`${row}-${index}`}>{row}</span>
      ))}
    </div>
  );
}
