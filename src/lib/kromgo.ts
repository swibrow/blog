export const KROMGO_BASE = "https://kromgo.wibrow.dev";

export interface KromgoBadge {
  value: string;
  color?: string;
}

/** Fetch a single kromgo badge as JSON; resolves to null on any failure. */
export async function fetchBadge(
  id: string,
  signal?: AbortSignal,
): Promise<KromgoBadge | null> {
  try {
    const res = await fetch(`${KROMGO_BASE}/badges/${id}?format=json`, {
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { value?: unknown; color?: string };
    if (data.value == null) return null;
    return { value: String(data.value), color: data.color };
  } catch {
    return null;
  }
}
