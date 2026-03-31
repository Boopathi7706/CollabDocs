import { Navbar } from "./navbar";
import { Outlet } from "react-router-dom";

export function CollabLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
