import { useEffect, useState } from "react";

export interface DiscussionStats {
  reactions: number;
  comments: number;
}

type StatsMap = Record<string, DiscussionStats>;

const CACHE_KEY = "giscus-stats";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: StatsMap;
  timestamp: number;
}

function readCache(): StatsMap | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(data: StatsMap) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
}

let fetchPromise: Promise<StatsMap> | null = null;

function fetchStats(): Promise<StatsMap> {
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(
    "https://api.github.com/repos/swibrow/blog/discussions?per_page=100",
    { headers: { Accept: "application/vnd.github+json" } }
  )
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      return res.json();
    })
    .then((discussions: Array<{ title: string; comments: number; reactions: { total_count: number } }>) => {
      const map: StatsMap = {};
      for (const d of discussions) {
        map[d.title] = {
          reactions: d.reactions.total_count,
          comments: d.comments,
        };
      }
      writeCache(map);
      fetchPromise = null;
      return map;
    })
    .catch((err) => {
      console.warn("Failed to fetch discussion stats:", err);
      fetchPromise = null;
      return {};
    });

  return fetchPromise;
}

export function useDiscussionStats(): StatsMap {
  const [stats, setStats] = useState<StatsMap>(() => readCache() || {});

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setStats(cached);
      return;
    }
    fetchStats().then(setStats);
  }, []);

  return stats;
}
