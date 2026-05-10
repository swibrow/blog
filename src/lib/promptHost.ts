// Returns the bare second-level domain for the terminal prompt label
// (samuel@<host>). Strips the leftmost subdomain so the prompt reads
// "samuel@wibrow.dev" instead of "samuel@samuel.wibrow.dev".
//
// Pass nothing in the browser to read window.location.hostname, or pass
// Astro.url.hostname / a literal from server-side code.
export function promptHost(hostname?: string): string {
  const h =
    hostname ??
    (typeof window !== "undefined" ? window.location.hostname : "wibrow.dev");
  if (!h) return "wibrow.dev";
  const parts = h.split(".");
  return parts.length > 2 ? parts.slice(1).join(".") : h;
}
