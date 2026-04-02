import { open } from "@tauri-apps/plugin-shell";
import type { ClientMeta } from "../../types/client";

interface Props {
  client: ClientMeta;
}

function GuidedSetupPanel({ client }: Props) {
  const steps = client.setupSteps ?? [];
  const isChatGptClient = client.id === "chatgpt-desktop" || client.id === "chatgpt";

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl rounded-xl border border-border bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-text">{client.name}</h2>
          <p className="mt-1 text-sm text-text-muted">
            This client is managed without a local config file. Use guided setup instead.
          </p>
        </div>

        {steps.length > 0 ? (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Setup steps
            </p>
            <ol className="space-y-2">
              {steps.map((step, index) => (
                <li key={`${step.text}-${index}`} className="rounded-lg border border-border bg-base p-3">
                  <p className="text-xs text-text">
                    <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      {index + 1}
                    </span>
                    {step.text}
                  </p>
                  {step.note && (
                    <p className="mt-1 pl-6 text-[11px] text-amber">
                      {step.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Setup instructions are available in the client documentation.
          </p>
        )}

        <div className="flex items-center gap-2">
          {isChatGptClient && (
            <button
              onClick={() => open("https://chatgpt.com")}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-text hover:bg-surface-hover"
            >
              Open ChatGPT
            </button>
          )}
          <button
            onClick={() => open(client.docsUrl)}
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
          >
            Open Documentation
          </button>
        </div>
      </div>
    </div>
  );
}

export default GuidedSetupPanel;
