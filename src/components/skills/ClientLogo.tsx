const CLAUDE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 24 24"><path d="m6.09 15.21 3.83-2.15.06-.19-.06-.1h-.19l-.64-.04-2.19-.06-1.9-.08-1.84-.1-.46-.1-.43-.57.04-.29.39-.26.56.05 1.23.08 1.85.13 1.34.08 1.99.21h.32l.04-.13-.11-.08-.08-.08-1.91-1.3-2.07-1.37-1.08-.79-.59-.4-.3-.37-.13-.82.53-.59.71.05.18.05.72.56 1.55 1.2 2.02 1.49.3.25.12-.08v-.06l-.12-.22-1.1-1.99L7.5 5.12l-.52-.84-.14-.5c-.05-.21-.08-.38-.08-.59l.61-.82.33-.11.81.11.34.3.5 1.15.81 1.81 1.26 2.46.37.73.2.68.07.21h.13v-.12l.1-1.38.19-1.7.19-2.19.06-.62.31-.74.61-.4.47.23.39.56-.05.36-.23 1.5-.45 2.36-.3 1.58h.17l.2-.2.8-1.06 1.34-1.68.59-.67.69-.73.44-.35h.84l.62.92-.28.95-.86 1.09-.71.93-1.02 1.38-.64 1.1.06.09h.15l2.32-.51 1.25-.23 1.49-.26.68.32.07.32-.27.66-1.6.39-1.87.37-2.79.66-.03.02.04.05 1.26.12.54.03h1.32l2.45.18.64.42.38.52-.06.39-.99.5-1.33-.32-3.1-.74-1.06-.27h-.15v.09l.89.87 1.63 1.47 2.04 1.89.1.47-.26.37-.28-.04-1.79-1.35-.69-.61-1.56-1.32h-.1v.14l.36.53 1.9 2.86.1.88-.14.29-.49.17-.54-.1-1.11-1.56-1.15-1.76-.93-1.58-.11.06-.55 5.89-.26.3-.59.23-.49-.37-.26-.61.26-1.2.32-1.56.26-1.24.23-1.54.14-.51v-.03l-.12.01-1.16 1.6-1.77 2.39-1.4 1.5-.34.13-.58-.3.05-.54.33-.48 1.94-2.46 1.17-1.53.75-.88v-.13h-.05l-5.14 3.34-.92.12-.39-.37.05-.61.19-.2 1.55-1.06Z"/></svg>`;

const OPENAI_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 24 24"><path d="M20.57 10.18c.45-1.36.3-2.85-.43-4.09a5.03 5.03 0 0 0-5.42-2.42 5.05 5.05 0 0 0-7.14-.38c-.66.59-1.15 1.35-1.43 2.19A4.98 4.98 0 0 0 2.82 7.9c-1.1 1.9-.85 4.29.62 5.91-.45 1.36-.3 2.85.43 4.09a5.045 5.045 0 0 0 5.43 2.42A5.03 5.03 0 0 0 13.06 22c2.19 0 4.14-1.41 4.81-3.5a4.98 4.98 0 0 0 3.33-2.42 5.04 5.04 0 0 0-.62-5.89Zm-7.52 10.51c-.88 0-1.72-.31-2.4-.87l.12-.07 3.98-2.3c.2-.12.33-.33.33-.57v-5.61l1.68.97s.03.02.03.04v4.65c0 2.07-1.68 3.74-3.75 3.75ZM5 17.25c-.44-.76-.6-1.65-.45-2.51l.12.07 3.99 2.3c.2.12.45.12.65 0l4.87-2.81v1.94s-.01.04-.03.05l-4.03 2.33A3.756 3.756 0 0 1 5 17.25M3.95 8.58a3.7 3.7 0 0 1 1.97-1.64v4.73c0 .23.12.45.32.56l4.85 2.8-1.68.97h-.06l-4.03-2.32a3.754 3.754 0 0 1-1.37-5.12zm13.83 3.21-4.86-2.82L14.6 8h.06l4.03 2.33a3.743 3.743 0 0 1 1.37 5.12 3.8 3.8 0 0 1-1.94 1.64v-4.73a.67.67 0 0 0-.34-.56Zm1.68-2.52-.12-.07-3.98-2.32a.63.63 0 0 0-.65 0L9.84 9.69V7.75s0-.04.02-.05l4.03-2.32a3.75 3.75 0 0 1 5.12 1.38c.44.76.59 1.64.45 2.51v.02ZM8.93 12.72l-1.68-.97s-.03-.03-.03-.05V7.06c0-2.07 1.68-3.75 3.75-3.74.87 0 1.72.31 2.39.87l-.12.07-3.98 2.3c-.2.12-.33.33-.33.57v5.6Zm.91-1.97 2.17-1.25 2.17 1.25v2.5l-2.16 1.25-2.17-1.25v-2.5Z"/></svg>`;

const GEMINI_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 24 24"><path d="M12 2c-.78 5.16-4.84 9.22-10 10 5.16.78 9.22 4.84 10 10 .78-5.16 4.84-9.22 10-10-5.16-.78-9.22-4.84-10-10"/></svg>`;


const WINDSURF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 24 24"><path d="m21.82,6.22h-.19c-1,0-1.82.81-1.82,1.81v4.06c0,.81-.67,1.47-1.47,1.47-.47,0-.95-.24-1.23-.64l-4.14-5.92c-.34-.49-.9-.78-1.51-.78-.94,0-1.79.8-1.79,1.79v4.08c0,.81-.66,1.47-1.47,1.47-.47,0-.95-.24-1.23-.64L2.34,6.3c-.1-.15-.34-.08-.34.11v3.54c0,.18.05.35.16.5l4.56,6.52c.27.39.67.67,1.13.77,1.15.26,2.2-.62,2.2-1.75v-4.08c0-.81.66-1.47,1.47-1.47h0c.49,0,.95.24,1.23.64l4.14,5.92c.34.49.88.78,1.51.78.97,0,1.79-.8,1.79-1.79v-4.08c0-.81.66-1.47,1.47-1.47h.16c.1,0,.18-.08.18-.18v-3.85c0-.1-.08-.18-.18-.18h0Z"/></svg>`;

const ANTIGRAVITY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="m19.94,20.59c1.09.82,2.73.27,1.23-1.23-4.5-4.36-3.55-16.36-9.14-16.36S7.39,15,2.89,19.36c-1.64,1.64.14,2.05,1.23,1.23,4.23-2.86,3.95-7.91,7.91-7.91s3.68,5.05,7.91,7.91Z"/></svg>`;

const COPILOT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#000000" viewBox="0 0 24 24"><path d="M18.04 6.33c1.09 1.16 1.56 2.75 1.76 4.97.52 0 1 .12 1.33.56l.61.83c.17.23.27.52.27.81v2.24c0 .29-.14.57-.38.74-2.76 2.02-6.16 3.64-9.62 3.64-3.83 0-7.67-2.21-9.62-3.64a.98.98 0 0 1-.38-.74V13.5c0-.3.09-.58.27-.82l.61-.82c.33-.45.81-.56 1.33-.56.2-2.22.66-3.81 1.76-4.97 2.08-2.2 4.84-2.45 6.01-2.45h.03c1.15 0 3.94.23 6.04 2.45ZM12 10.03c-.23 0-.51.02-.8.05-.07.35-.24.67-.47.95-.67.66-1.56 1.02-2.5 1.02-.53 0-1.09-.12-1.54-.41-.43.15-.84.35-.88.86-.04.95-.05 1.91-.05 2.88 0 .48 0 .96-.02 1.45 0 .28.17.54.43.66 2.06.94 4.02 1.41 5.82 1.41s3.75-.47 5.82-1.41c.26-.12.43-.37.43-.66.02-1.44 0-2.89-.06-4.32-.03-.52-.45-.71-.87-.86-.45.29-1.02.4-1.54.4-.93 0-1.83-.35-2.5-1.01-.23-.27-.39-.6-.47-.95-.27-.03-.54-.04-.8-.05Zm-2.11 3.44c.45 0 .82.36.82.81v1.5c0 .45-.36.81-.81.81s-.81-.36-.81-.81v-1.51c0-.45.36-.81.81-.81Zm4.17 0c.45 0 .81.36.81.81v1.5c0 .45-.36.81-.81.81s-.81-.36-.81-.81v-1.51c0-.45.37-.81.81-.81Zm-5.7-7.38c-.87.09-1.61.37-1.98.78-.81.88-.64 3.13-.17 3.61.46.39 1.05.59 1.66.56.53 0 1.53-.12 2.35-.95.37-.35.59-1.23.56-2.11-.02-.71-.23-1.3-.52-1.55-.33-.28-1.06-.41-1.89-.34Zm5.39.34c-.3.25-.5.84-.52 1.55-.02.88.2 1.76.56 2.11.62.62 1.47.96 2.34.95.7 0 1.33-.23 1.66-.56.47-.48.64-2.73-.17-3.62-.38-.39-1.11-.69-1.98-.77-.83-.08-1.56.05-1.89.34M12 8.26c-.2 0-.44.02-.7.04.03.13.04.29.05.45 0 .12 0 .23-.02.35.25-.02.47-.02.66-.02s.41 0 .66.02c-.02-.12-.02-.23-.02-.35.02-.16.02-.31.05-.45-.27-.02-.5-.04-.7-.04Z"/></svg>`;

const CLAUDE_CODE_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z" fill="#000000" fill-rule="evenodd"/></svg>`;

const MCPORTER_SVG_DARK = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobster-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e6e6e6"/></linearGradient></defs><path d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z" fill="url(#lobster-gradient)" stroke="#cccccc" stroke-width="0.5"/><path d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z" fill="url(#lobster-gradient)" stroke="#cccccc" stroke-width="0.5"/><path d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z" fill="url(#lobster-gradient)" stroke="#cccccc" stroke-width="0.5"/><path d="M45 15 Q35 5 30 8" stroke="#cccccc" stroke-width="3" stroke-linecap="round"/><path d="M75 15 Q85 5 90 8" stroke="#cccccc" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="35" r="6" fill="#050810"/><circle cx="75" cy="35" r="6" fill="#050810"/><circle cx="46" cy="34" r="2.5" fill="#00e5cc"/><circle cx="76" cy="34" r="2.5" fill="#00e5cc"/></svg>`;
const MCPORTER_SVG_LIGHT = `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="lobster-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2a2a2a"/><stop offset="100%" stop-color="#000000"/></linearGradient></defs><path d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z" fill="url(#lobster-gradient)"/><path d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z" fill="url(#lobster-gradient)"/><path d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z" fill="url(#lobster-gradient)"/><path d="M45 15 Q35 5 30 8" stroke="#2a2a2a" stroke-width="3" stroke-linecap="round"/><path d="M75 15 Q85 5 90 8" stroke="#2a2a2a" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="35" r="6" fill="#050810"/><circle cx="75" cy="35" r="6" fill="#050810"/><circle cx="46" cy="34" r="2.5" fill="#00e5cc"/><circle cx="76" cy="34" r="2.5" fill="#00e5cc"/></svg>`;

const OPENCODE_SVG = `<svg viewBox="0 0 240 300" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M180 240H60V120H180V240Z" fill="#4B4646"/><path d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z" fill="#F1ECEC"/></svg>`;

const CODEX_SVG = `<svg fill="currentColor" fill-rule="evenodd" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="M8.086.457a6.105 6.105 0 013.046-.415c1.333.153 2.521.72 3.564 1.7a.117.117 0 00.107.029c1.408-.346 2.762-.224 4.061.366l.063.03.154.076c1.357.703 2.33 1.77 2.918 3.198.278.679.418 1.388.421 2.126a5.655 5.655 0 01-.18 1.631.167.167 0 00.04.155 5.982 5.982 0 011.578 2.891c.385 1.901-.01 3.615-1.183 5.14l-.182.22a6.063 6.063 0 01-2.934 1.851.162.162 0 00-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451-1.583-.008-2.986-.587-4.21-1.736a.145.145 0 00-.14-.032c-.518.167-1.04.191-1.604.185a5.924 5.924 0 01-2.595-.622 6.058 6.058 0 01-2.146-1.781c-.203-.269-.404-.522-.551-.821a7.74 7.74 0 01-.495-1.283 6.11 6.11 0 01-.017-3.064.166.166 0 00.008-.074.115.115 0 00-.037-.064 5.958 5.958 0 01-1.38-2.202 5.196 5.196 0 01-.333-1.589 6.915 6.915 0 01.188-2.132c.45-1.484 1.309-2.648 2.577-3.493.282-.188.55-.334.802-.438.286-.12.573-.22.861-.304a.129.129 0 00.087-.087A6.016 6.016 0 015.635 2.31C6.315 1.464 7.132.846 8.086.457zm-.804 7.85a.848.848 0 00-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 001.46.864l1.94-3.272a.849.849 0 00.007-.854l-1.94-3.393zm5.446 6.24a.849.849 0 000 1.695h4.848a.849.849 0 000-1.696h-4.848z"/></svg>`;

const CURSOR_SVG = `<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g clip-path="url(#prefix__clip0_5_17)"><rect width="512" height="512" rx="122" fill="#000"/><g clip-path="url(#prefix__clip1_5_17)"><mask id="prefix__a" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="85" y="89" width="343" height="334"><path d="M85 89h343v334H85V89z" fill="#fff"/></mask><g mask="url(#prefix__a)"><path d="M255.428 423l148.991-83.5L255.428 256l-148.99 83.5 148.99 83.5z" fill="url(#prefix__paint0_linear_5_17)"/><path d="M404.419 339.5v-167L255.428 89v167l148.991 83.5z" fill="url(#prefix__paint1_linear_5_17)"/><path d="M255.428 89l-148.99 83.5v167l148.99-83.5V89z" fill="url(#prefix__paint2_linear_5_17)"/><path d="M404.419 172.5L255.428 423V256l148.991-83.5z" fill="#E4E4E4"/><path d="M404.419 172.5L255.428 256l-148.99-83.5h297.981z" fill="#fff"/></g></g></g><defs><linearGradient id="prefix__paint0_linear_5_17" x1="255.428" y1="256" x2="255.428" y2="423" gradientUnits="userSpaceOnUse"><stop offset=".16" stop-color="#fff" stop-opacity=".39"/><stop offset=".658" stop-color="#fff" stop-opacity=".8"/></linearGradient><linearGradient id="prefix__paint1_linear_5_17" x1="404.419" y1="173.015" x2="257.482" y2="261.497" gradientUnits="userSpaceOnUse"><stop offset=".182" stop-color="#fff" stop-opacity=".31"/><stop offset=".715" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="prefix__paint2_linear_5_17" x1="255.428" y1="89" x2="112.292" y2="342.802" gradientUnits="userSpaceOnUse"><stop stop-color="#fff" stop-opacity=".6"/><stop offset=".667" stop-color="#fff" stop-opacity=".22"/></linearGradient><clipPath id="prefix__clip0_5_17"><path fill="#fff" d="M0 0h512v512H0z"/></clipPath><clipPath id="prefix__clip1_5_17"><path fill="#fff" transform="translate(85 89)" d="M0 0h343v334H0z"/></clipPath></defs></svg>`;

import { useThemeStore } from "../../store/themeStore";

function getLogoSvg(clientId: string, isDark: boolean): string | null {
  if (clientId === "claude-code") return CLAUDE_CODE_SVG;
  if (clientId.startsWith("claude")) return CLAUDE_SVG;
  if (clientId === "cursor") return CURSOR_SVG;
  if (clientId === "windsurf") return WINDSURF_SVG;
  if (clientId === "opencode") return OPENCODE_SVG;
  if (clientId.includes("mcpporter") || clientId.includes("mcporter")) return isDark ? MCPORTER_SVG_DARK : MCPORTER_SVG_LIGHT;
  if (clientId.startsWith("codex")) return CODEX_SVG;
  if (clientId.includes("openai") || clientId.includes("chatgpt")) return OPENAI_SVG;
  if (clientId.includes("gemini") || clientId.includes("google")) return GEMINI_SVG;
  if (clientId.includes("copilot")) return COPILOT_SVG;
  if (clientId === "antigravity") return ANTIGRAVITY_SVG;
  return null;
}

// These logos use their own colors — skip the monochrome filter.
const COLORED_LOGO_IDS = new Set(["cursor", "mcpporter", "opencode"]);

interface ClientLogoProps {
  clientId: string;
  clientName: string;
  size?: number;
}

export function ClientLogo({ clientId, clientName, size = 22 }: ClientLogoProps) {
  const { themeId } = useThemeStore();
  const isDark = themeId !== "light";
  const svg = getLogoSvg(clientId, isDark);
  const isColored = COLORED_LOGO_IDS.has(clientId);
  const filterClass = isColored ? "" : isDark ? "brightness-0 invert" : "brightness-0";

  if (svg) {
    return (
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
        width={size}
        height={size}
        alt={clientName}
        className={`flex-shrink-0 rounded-md ${filterClass}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex-shrink-0 rounded-md bg-surface-overlay border border-border flex items-center justify-center"
    >
      <span style={{ fontSize: Math.floor(size * 0.48) }} className="font-bold text-text-muted leading-none">
        {clientName[0]?.toUpperCase()}
      </span>
    </div>
  );
}
