import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getOs(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

/** Appends UTM tracking params to mcp360.ai URLs. Passes through all other URLs unchanged. */
export function trackUrl(url: string): string {
  if (!url.includes("mcp360.ai")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=mtarsier&utm_medium=desktop&utm_content=${getOs()}`;
}
