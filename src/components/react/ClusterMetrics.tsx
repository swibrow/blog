import { useEffect, useState } from "react";
import { fetchBadge } from "@/lib/kromgo";

const BADGES = ["cpu", "memory", "pods", "uptime", "nodes", "apps", "appssynced"] as const;
type BadgeId = (typeof BADGES)[number];

const CARDS: { id: BadgeId; label: string }[] = [
  { id: "cpu", label: "cpu" },
  { id: "memory", label: "memory" },
  { id: "pods", label: "pods" },
  { id: "uptime", label: "uptime" },
  { id: "nodes", label: "nodes" },
  { id: "appssynced", label: "apps synced" },
];

type Values = Partial<Record<BadgeId, string>>;

export default function ClusterMetrics() {
  const [values, setValues] = useState<Values | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const start = performance.now();

    Promise.all(BADGES.map((id) => fetchBadge(id, controller.signal))).then(
      (results) => {
        clearTimeout(timeout);
        const next: Values = {};
        results.forEach((badge, i) => {
          if (badge) next[BADGES[i]] = badge.value;
        });
        if (Object.keys(next).length === 0) {
          setOffline(true);
          return;
        }
        setValues(next);
        setElapsed(Math.round(performance.now() - start));
      },
    );

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (offline) {
    return (
      <p className="font-mono text-sm" style={{ color: "var(--ctp-subtext0)" }}>
        <span style={{ color: "var(--ctp-overlay0)" }}>●</span> cluster metrics
        offline
      </p>
    );
  }

  const display = (id: BadgeId) => {
    if (!values) return "—";
    if (id === "appssynced" && values.appssynced && values.apps) {
      return `${values.appssynced}/${values.apps}`;
    }
    return values[id] ?? "—";
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {CARDS.map(({ id, label }) => (
          <div key={id} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{display(id)}</div>
          </div>
        ))}
      </div>
      {elapsed !== null && (
        <p
          className="mt-3 font-mono text-xs"
          style={{ color: "var(--ctp-overlay0)" }}
        >
          fetched in {elapsed}ms
        </p>
      )}
    </div>
  );
}
