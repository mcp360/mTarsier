/** Traverse a dot-separated config key path in parsed JSON and return the servers object. */
export function extractServersFromJson(
  content: string,
  configKey: string
): Record<string, unknown> {
  try {
    const json = JSON.parse(content);
    const keys = configKey.split(".");
    let current = json;
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return {};
      }
    }
    return current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
