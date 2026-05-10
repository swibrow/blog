import { useState, useMemo, useCallback, useEffect } from "react";

interface TilEntry {
  slug: string;
  title: string;
  date: string;
  tags: string[];
}

interface Props {
  entries: TilEntry[];
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="rounded px-0.5"
            style={{ backgroundColor: "var(--ctp-yellow)", color: "var(--ctp-base)" }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function TilSearch({ entries }: Props) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Read tag from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tag = params.get("tag");
    if (tag) setActiveTag(tag);
  }, []);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (activeTag && !entry.tags.includes(activeTag)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [entries, search, activeTag]);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 font-mono text-sm outline-none transition-colors focus:ring-2"
          style={{
            backgroundColor: "var(--ctp-mantle)",
            borderColor: "var(--ctp-surface0)",
            color: "var(--ctp-text)",
            // @ts-expect-error CSS custom property
            "--tw-ring-color": "var(--ctp-blue)",
          }}
        />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {allTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => handleTagClick(tag)}
            className="rounded-full border px-3 py-1 font-mono text-xs transition-colors"
            style={{
              backgroundColor: activeTag === tag ? "var(--ctp-blue)" : "var(--ctp-surface0)",
              color: activeTag === tag ? "var(--ctp-base)" : "var(--ctp-subtext1)",
              borderColor: activeTag === tag ? "var(--ctp-blue)" : "var(--ctp-surface1)",
            }}
          >
            {tag}
            <span className="ml-1 opacity-60">{count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center font-mono text-sm" style={{ color: "var(--ctp-subtext0)" }}>
          No entries matching "{search}"
          {activeTag && ` in #${activeTag}`}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((entry) => (
          <a
            key={entry.slug}
            href={`/til/${entry.slug}`}
            className="block rounded-lg border p-4 transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="font-mono text-base font-bold" style={{ color: "var(--ctp-blue)" }}>
                <Highlight text={entry.title} query={search} />
              </h2>
              <time
                className="shrink-0 font-mono text-xs"
                style={{ color: "var(--ctp-subtext0)" }}
              >
                {new Date(entry.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2 py-0.5 font-mono text-xs"
                  style={{
                    backgroundColor: activeTag === tag ? "var(--ctp-blue)" : "var(--ctp-surface0)",
                    color: activeTag === tag ? "var(--ctp-base)" : "var(--ctp-subtext0)",
                  }}
                >
                  <Highlight text={`#${tag}`} query={search} />
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
