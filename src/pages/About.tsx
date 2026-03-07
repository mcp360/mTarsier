import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import mtarsierLogo from "../assets/mtarsier-logo.png";

function About() {
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  const openLink = (url: string) => {
    open(url);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-[500px] space-y-6">
        {/* Logo + App Name */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={mtarsierLogo} alt="mTarsier" className="h-24 w-auto object-contain" />
          <h1 className="text-3xl font-bold">
            <span className="text-primary">m</span>
            <span className="text-text">Tarsier</span>
          </h1>
          {version && (
            <span className="inline-block rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-muted border border-border-hover">
              v{version}
            </span>
          )}
          <p className="text-text-muted text-sm">
            Full visibility for your MCP ecosystem
          </p>
        </div>

        {/* Organization */}
        <div className="rounded-lg border border-border bg-surface p-4 space-y-2 text-sm text-center">
          <p className="text-text-muted">
            Built by <span className="text-text font-medium">Delta4 Infotech</span>, Mohali, India
          </p>
          <p className="text-text-muted">
            Powered by{" "}
            <button
              onClick={() => openLink("https://mcp360.ai")}
              className="text-primary font-medium hover:underline cursor-pointer"
            >
              MCP360
            </button>
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => openLink("https://github.com/mtarsier/mtarsier")}
            className="text-text-muted hover:text-primary cursor-pointer transition-colors"
          >
            GitHub
          </button>
          <span className="text-border">|</span>
          <span className="text-text-muted">License: MIT</span>
          <span className="text-border">|</span>
          <button
            onClick={() => openLink("https://opensource.org/licenses/MIT")}
            className="text-text-muted hover:text-primary cursor-pointer transition-colors"
          >
            Third-party licenses
          </button>
        </div>

        {/* Conservation note */}
        <div className="rounded-lg border border-border bg-surface-overlay p-4 text-sm text-center space-y-2">
          <p className="text-text-muted">
            Named after the Tarsier, one of the world's smallest primates. Tarsiers are endangered
            — we support conservation efforts.
          </p>
          <button
            onClick={() => openLink("https://www.iucnredlist.org/search?query=tarsius")}
            className="text-primary hover:underline cursor-pointer text-xs font-medium"
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
}

export default About;
