import { useConfigStore } from "../../store/configStore";

function ModeSwitcher() {
  const { mode, setMode } = useConfigStore();

  return (
    <div className="flex bg-base-light rounded-lg p-0.5 border border-border">
      <button
        onClick={() => setMode("easy")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === "easy"
            ? "bg-primary/15 text-primary"
            : "text-text-muted hover:text-text"
        }`}
      >
        Easy Manage
      </button>
      <button
        onClick={() => setMode("edit")}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          mode === "edit"
            ? "bg-primary/15 text-primary"
            : "text-text-muted hover:text-text"
        }`}
      >
        Edit File
      </button>
    </div>
  );
}

export default ModeSwitcher;
