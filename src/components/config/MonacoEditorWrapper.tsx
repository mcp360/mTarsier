import { useRef, useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useConfigStore } from "../../store/configStore";
import { useThemeStore } from "../../store/themeStore";
import { getMonacoTheme } from "../../lib/themes";

function MonacoEditorWrapper() {
  const { rawContent, setRawContent } = useConfigStore();
  const theme = useThemeStore((s) => s.theme);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = useCallback(
    (_editor, monaco) => {
      monacoRef.current = monaco;
      monaco.editor.defineTheme("tarsier-dynamic", getMonacoTheme(theme));
      monaco.editor.setTheme("tarsier-dynamic");
    },
    [theme]
  );

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.defineTheme("tarsier-dynamic", getMonacoTheme(theme));
      monacoRef.current.editor.setTheme("tarsier-dynamic");
    }
  }, [theme]);

  return (
    <div className="flex-1 overflow-hidden">
      <Editor
        height="100%"
        language="json"
        value={rawContent}
        onChange={(value) => setRawContent(value ?? "")}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "'Geist Mono', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineNumbers: "on",
          renderLineHighlight: "gutter",
          bracketPairColorization: { enabled: true },
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default MonacoEditorWrapper;
