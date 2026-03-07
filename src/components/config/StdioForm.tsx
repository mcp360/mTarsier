import EnvVarEditor from "./EnvVarEditor";

interface Props {
  command: string;
  args: string[];
  env: Record<string, string>;
  onChange: (data: { command: string; args: string[]; env: Record<string, string> }) => void;
}

function StdioForm({ command, args, env, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">Command</label>
        <input
          type="text"
          value={command}
          onChange={(e) => onChange({ command: e.target.value, args, env })}
          placeholder="npx, node, python..."
          className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-text-muted mb-1 block">
          Arguments <span className="text-text-muted/50">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={args.join(", ")}
          onChange={(e) =>
            onChange({
              command,
              args: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              env,
            })
          }
          placeholder="-y, @modelcontextprotocol/server-filesystem, /path"
          className="w-full px-2.5 py-1.5 text-xs font-mono bg-base border border-border rounded-md text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
        />
      </div>
      <EnvVarEditor value={env} onChange={(newEnv) => onChange({ command, args, env: newEnv })} />
    </div>
  );
}

export default StdioForm;
