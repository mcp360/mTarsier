import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useConfigStore } from "../store/configStore";
import ConfigClientSelector from "../components/config/ConfigClientSelector";
import ConfigToolbar from "../components/config/ConfigToolbar";
import EasyModeEditor from "../components/config/EasyModeEditor";
import MonacoEditorWrapper from "../components/config/MonacoEditorWrapper";
import ValidationBar from "../components/config/ValidationBar";
import BackupPanel from "../components/config/BackupPanel";

function Config() {
  const [searchParams] = useSearchParams();
  const {
    selectedClient,
    selectedClientId,
    mode,
    isLoading,
    error,
    rawContent,
    showBackupPanel,
    setSelectedClient,
    loadConfig,
    createDefaultConfig,
  } = useConfigStore();

  // Reload config from disk every time the Config page mounts (e.g. returning from another tab).
  // Intentional empty deps — we only want this on mount, not on every selectedClientId change
  // (setSelectedClient already calls loadConfig for explicit client switches).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedClientId) {
      loadConfig(selectedClientId);
    }
  }, []);

  const appliedParam = useRef(false);
  useEffect(() => {
    if (appliedParam.current) return;
    const clientParam = searchParams.get("client");
    if (clientParam) {
      setSelectedClient(clientParam);
      appliedParam.current = true;
    }
  }, [searchParams, setSelectedClient]);

  return (
    <div className="flex h-full">
      <ConfigClientSelector />

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedClient ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-sm">Select a client to manage its MCP config</p>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <ConfigToolbar />

            {error && (
              <div className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-b border-red-400/20">
                {error}
              </div>
            )}

            {!rawContent && selectedClient.configPath ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <p className="text-text-muted text-sm">
                  No config file found for {selectedClient.name}
                </p>
                <button
                  onClick={createDefaultConfig}
                  className="px-4 py-2 text-xs font-medium bg-primary/10 text-primary border border-primary/30 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Create Default Config
                </button>
              </div>
            ) : mode === "easy" ? (
              <EasyModeEditor />
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <MonacoEditorWrapper />
                <ValidationBar />
              </div>
            )}

            <div className="px-4 py-1.5 border-t border-border">
              <p className="text-[10px] text-text-muted">
                Changes apply after restarting the client
              </p>
            </div>
          </>
        )}
      </div>

      {showBackupPanel && selectedClient && <BackupPanel />}
    </div>
  );
}

export default Config;
