import { useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { useClientStore } from "../store/clientStore";
import ClientFilter from "../components/clients/ClientFilter";
import ClientCard from "../components/clients/ClientCard";
import ClientDetailPanel from "../components/clients/ClientDetailPanel";

function Clients() {
  const { clients, filter, isDetecting, selectedClientId } = useClientStore();
  const [search, setSearch] = useState("");

  const filtered = (filter === "All" ? clients : clients.filter((c) => c.meta.type === filter))
    .filter((c) => !search.trim() || c.meta.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="mt-1 text-text-muted">
            Manage MCP client configurations across your installed apps.
          </p>
        </div>

        <div className="flex items-center px-6 pb-4">
          <ClientFilter />
          <div className="relative ml-auto">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-8 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/40 w-44"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isDetecting && clients.every((c) => !c.installed && c.serverCount === null) ? (
            <div className="flex items-center gap-2 py-8 text-text-muted">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Detecting installed clients...
            </div>
          ) : filtered.length === 0 && search.trim() ? (
            <div>
              {/* Skeleton ghost cards */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 mb-6 opacity-30 pointer-events-none select-none">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface p-4 space-y-3 animate-pulse">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-surface-overlay" />
                      <div className="h-3 w-28 rounded bg-surface-overlay" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded bg-surface-overlay" />
                      <div className="h-2 w-2/3 rounded bg-surface-overlay" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-xs text-text-muted">
                  No clients found for <span className="text-text font-medium">"{search}"</span>
                </p>
                <p className="text-[11px] text-text-muted/60">Missing your favourite AI client?</p>
                <button
                  onClick={() => open("https://mcp360.ai/mtarsier/github/request-client")}
                  className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Request this client on GitHub
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((client) => (
                <ClientCard key={client.meta.id} client={client} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClientId && <ClientDetailPanel />}
    </div>
  );
}

export default Clients;
