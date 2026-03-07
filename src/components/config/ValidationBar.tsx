import { useConfigStore } from "../../store/configStore";

function ValidationBar() {
  const { validationError } = useConfigStore();

  return (
    <div
      className={`px-4 py-1.5 text-xs border-t ${
        validationError
          ? "border-red-500/30 bg-red-500/5 text-red-400"
          : "border-primary/20 bg-primary/5 text-primary/80"
      }`}
    >
      {validationError ? validationError : "Valid JSON"}
    </div>
  );
}

export default ValidationBar;
