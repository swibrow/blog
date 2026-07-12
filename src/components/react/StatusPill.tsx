import { useEffect, useState } from "react";
import { fetchBadge } from "@/lib/kromgo";

type Status = "unknown" | "operational" | "degraded";

export default function StatusPill() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetchBadge("alerts", controller.signal).then((badge) => {
      clearTimeout(timeout);
      if (!badge) return;
      const firing = parseInt(badge.value, 10);
      if (Number.isNaN(firing)) return;
      setStatus(firing > 0 ? "degraded" : "operational");
    });

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (status === "unknown") return null;

  const operational = status === "operational";
  return (
    <span
      className="hidden items-center gap-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-wider sm:inline-flex"
      style={{ color: operational ? "var(--ctp-green)" : "var(--ctp-peach)" }}
      title={operational ? "All cluster alerts clear" : "Cluster alerts firing"}
    >
      <span aria-hidden="true">●</span>
      {operational ? "operational" : "degraded"}
    </span>
  );
}
