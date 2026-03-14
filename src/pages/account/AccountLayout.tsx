// account/AccountLayout.tsx
import { Outlet } from "react-router-dom";

export const AccountLayout = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,#ecf2ff_0%,#f6f7fb_45%,#f2f3f6_100%)] text-slate-900">
      {/* CONTENT */}
      <main className="pt-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
};
