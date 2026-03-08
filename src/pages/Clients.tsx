import { useState } from "react";
import { useClientStore } from "../store/clientStore";
import { useClientDetection } from "../hooks/useClientDetection";
import ClientFilter from "../components/clients/ClientFilter";
import ClientCard from "../components/clients/ClientCard";
import ClientDetailPanel from "../components/clients/ClientDetailPanel";

function Clients() {
  useClientDetection();
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
          {isDetecting ? (
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
