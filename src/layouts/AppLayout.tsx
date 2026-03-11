import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Sidebar from "../components/Sidebar";
import { useClientDetection } from "../hooks/useClientDetection";
import { useClientStore } from "../store/clientStore";

function AppLayout() {
  useClientDetection();

  const detectAll = useClientStore((s) => s.detectAll);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const setupListener = async () => {
      const unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        if (!focused) return;
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { detectAll(); }, 1000);
      });
      return unlisten;
    };

    const unlistenPromise = setupListener();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [detectAll]);

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
