import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function AppLayout() {
  return (
    <div className="h-screen w-screen overflow-hidden p-2">
      <div className="flex h-full w-full overflow-hidden rounded-xl border border-border bg-base">
        <Sidebar />
        <main className="relative flex-1 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
