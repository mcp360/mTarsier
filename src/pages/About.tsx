import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";
import mtarsierAnimated from "../assets/mtarsier-animated.svg";
import { trackUrl } from "../lib/utils";

function About() {
  const [version, setVersion] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion);
    const t = setTimeout(() => setBubbleVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const openLink = (url: string) => {
    open(trackUrl(url));
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-[480px] space-y-5">

        {/* Logo + bubble + title — all visually balanced together */}
        <div className="flex flex-col items-center gap-3 text-center">

          {/* Logo — always centered; bubble is absolute so it never shifts layout */}
          <div className="relative">
            <img src={mtarsierAnimated} alt="mTarsier" className="h-24 w-auto object-contain" />

            <div
              className={`absolute left-full top-1/2 -translate-y-1/2 ml-4 transition-all duration-500 ease-out ${
                bubbleVisible
                  ? "opacity-100 translate-x-0 scale-100"
                  : "opacity-0 -translate-x-3 scale-95 pointer-events-none"
              }`}
            >
              <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-r-[12px] border-r-primary/50" />
              <button
                onClick={() => openLink("https://mcp360.ai/mtarsier/github/starus")}
                className="flex items-center gap-3 bg-surface border border-primary/50 rounded-xl px-4 py-3 shadow-lg hover:border-primary hover:bg-surface-hover transition-colors text-left whitespace-nowrap"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary flex-shrink-0">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-text leading-tight">Star us on GitHub</p>
                  <p className="text-[10px] text-text-muted leading-tight mt-0.5">Enjoying it? A star means a lot to us</p>
                </div>
              </button>
            </div>
          </div>

          <h1 className="text-3xl font-bold">
            <span className="text-primary">m</span>
            <span className="text-text">Tarsier</span>
          </h1>
          {version && (
            <span className="inline-block rounded-full bg-surface-overlay px-3 py-1 text-xs font-medium text-text-muted border border-border-hover">
              v{version}
            </span>
          )}
          <p className="text-text-muted text-sm">Full visibility for your MCP ecosystem</p>
        </div>

        {/* Quick links */}
        <div className="flex items-center justify-center gap-5 text-xs text-text-muted">
          <button onClick={() => openLink("https://mcp360.ai/mtarsier")} className="hover:text-primary transition-colors">
            Website
          </button>
          <span className="text-border">·</span>
          <button onClick={() => openLink("https://mcp360.ai/mtarsier/github")} className="hover:text-primary transition-colors">
            GitHub
          </button>
          <span className="text-border">·</span>
          <button onClick={() => openLink("https://github.com/mcp360/mtarsier/issues")} className="hover:text-primary transition-colors">
            Report Issue
          </button>
          <span className="text-border">·</span>
          <button onClick={() => openLink("https://opensource.org/licenses/MIT")} className="hover:text-primary transition-colors">
            License: MIT
          </button>
        </div>

        {/* Conservation note */}
        <div className="rounded-lg border border-border bg-surface-overlay p-4 text-center space-y-1.5">
          <p className="text-xs text-text-muted">
            Named after the Tarsier — one of the world's smallest primates.
            Tarsiers are endangered. We support conservation efforts.
          </p>
          <button
            onClick={() => openLink("https://www.iucnredlist.org/search?query=tarsius")}
            className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
          >
            Learn more →
          </button>
        </div>

      </div>
    </div>
  );
}

export default About;
