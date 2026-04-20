import { useState } from "react";
import { ExportFlowDialog } from "./ExportFlowDialog";
import { ImportFlowDialog } from "./ImportFlowDialog";

export function FlowSection() {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-1">
        Flow
      </h2>
      <p className="text-xs text-text-muted mb-4">
        Export or import your entire setup — all clients, MCP servers, and skills — as a single file.
      </p>

      <div className="max-w-2xl rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-text">App Flow</h3>
          <p className="mt-1 text-xs text-text-muted">
            Transfer your full MCP setup between machines or share it with others.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1.5 rounded border border-primary/40 text-primary/80 text-sm
              hover:border-primary hover:text-primary transition-colors"
          >
            Export
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-3 py-1.5 rounded border border-border text-text-muted text-sm
              hover:border-text-muted hover:text-text transition-colors"
          >
            Import
          </button>
        </div>
      </div>

      {showExport && <ExportFlowDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportFlowDialog onClose={() => setShowImport(false)} />}
    </section>
  );
}
