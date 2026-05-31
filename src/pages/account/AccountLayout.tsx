// account/AccountLayout.tsx
import { Outlet } from "react-router-dom";

export const AccountLayout = () => {
  return (
    <div className="min-h-screen bg-[#f3f4f7] text-slate-900">
      {/* CONTENT */}
      <main className="pt-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
};
