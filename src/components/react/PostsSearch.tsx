import { useState, useMemo, useCallback, useEffect } from "react";

interface PostEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  isTil: boolean;
}

interface Props {
  entries: PostEntry[];
}

type TypeFilter = "all" | "posts" | "til";

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

export default function PostsSearch({ entries }: Props) {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

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
        if (tag === "til") continue;
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (typeFilter === "posts" && entry.isTil) return false;
      if (typeFilter === "til" && !entry.isTil) return false;
      if (activeTag && !entry.tags.includes(activeTag)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [entries, search, activeTag, typeFilter]);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search posts and TIL notes..."
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "all"],
            ["posts", "posts"],
            ["til", "til"],
          ] as [TypeFilter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTypeFilter(value)}
            className="rounded-full border px-3 py-1 font-mono text-xs transition-colors"
            style={{
              backgroundColor: typeFilter === value ? "var(--ctp-green)" : "var(--ctp-surface0)",
              color: typeFilter === value ? "var(--ctp-base)" : "var(--ctp-subtext1)",
              borderColor: typeFilter === value ? "var(--ctp-green)" : "var(--ctp-surface1)",
            }}
          >
            {label}
          </button>
        ))}
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

      <div>
        {filtered.map((entry) => (
          <a key={entry.slug} href={`/posts/${entry.slug}`} className="post-row">
            <div className="flex items-center gap-2">
              <time className="font-mono text-xs" style={{ color: "var(--ctp-sapphire)" }}>
                {entry.date.slice(0, 10)}
              </time>
              {entry.isTil && (
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase"
                  style={{ backgroundColor: "var(--ctp-yellow)", color: "var(--ctp-base)" }}
                >
                  til
                </span>
              )}
              {entry.tags
                .filter((tag) => tag !== "til")
                .map((tag) => (
                  <span
                    key={tag}
                    className="hidden font-mono text-xs sm:inline"
                    style={{
                      color: activeTag === tag ? "var(--ctp-blue)" : "var(--ctp-overlay0)",
                    }}
                  >
                    <Highlight text={`#${tag}`} query={search} />
                  </span>
                ))}
            </div>
            <h2 className="post-row-title mt-1 font-mono text-base font-bold">
              <Highlight text={entry.title} query={search} />
            </h2>
            {entry.description && (
              <p className="mt-1 text-sm" style={{ color: "var(--ctp-subtext0)" }}>
                <Highlight text={entry.description} query={search} />
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
