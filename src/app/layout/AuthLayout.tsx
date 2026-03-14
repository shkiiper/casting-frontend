import type { ReactNode } from 'react';
import './AuthLayout.css';

interface Props {
  children: ReactNode;
}

export function AuthLayout({ children }: Props) {
  return (
    <div className="auth-root">
      <div className="auth-scene" />
      <div className="auth-content">{children}</div>
    </div>
  );
}
