import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { onOpenUrl, getCurrent } from "@tauri-apps/plugin-deep-link";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Config from "./pages/Config";
import Skills from "./pages/Skills";
import Marketplace from "./pages/Marketplace";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import About from "./pages/About";
import DeepLinkHandler from "./components/deeplink/DeepLinkHandler";
import { parseDeepLink, useDeepLinkStore } from "./store/deepLinkStore";

function DeepLinkListener() {
  const setPending = useDeepLinkStore((s) => s.setPending);

  useEffect(() => {
    // Cold start: read the URL that launched the app (missed before frontend mounted)
    getCurrent()
      .then((urls) => {
        const url = urls?.[0];
        if (url) {
          const action = parseDeepLink(url);
          if (action) setPending(action);
        }
      })
      .catch(() => {});

    // Listen for deep links forwarded from the Rust backend (secondary instances)
    const unlistenBackend = listen<string>("deep-link-received", (event) => {
      const action = parseDeepLink(event.payload);
      if (action) setPending(action);
    });

    // Listen for deep links received directly by the plugin (primary instance on macOS)
    const unlistenPlugin = onOpenUrl((urls) => {
      const url = urls[0];
      if (url) {
        const action = parseDeepLink(url);
        if (action) setPending(action);
      }
    });

    return () => {
      unlistenBackend.then((fn) => fn());
      unlistenPlugin.then((fn) => fn());
    };
  }, [setPending]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <DeepLinkListener />
      <DeepLinkHandler />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/config" element={<Config />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/audit" element={<AuditLogs />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
