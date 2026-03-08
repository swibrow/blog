import { useState, useMemo, useCallback } from "react";
import SectionHeading from "@components/layout/SectionHeading";
import Markdown from "@components/ui/Markdown";
import Comments from "@components/ui/Comments";
import { tilEntries } from "@/data/til";
import { useDiscussionStats } from "@/hooks/useDiscussionStats";
import { motion, AnimatePresence } from "framer-motion";

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

function StatsBadge({ reactions, comments }: { reactions: number; comments: number }) {
  return (
    <div className="flex items-center gap-3 font-mono text-xs" style={{ color: "var(--ctp-subtext0)" }}>
      {reactions > 0 && (
        <span className="flex items-center gap-1">
          <span>👍</span> {reactions}
        </span>
      )}
      {comments > 0 && (
        <span className="flex items-center gap-1">
          <span>💬</span> {comments}
        </span>
      )}
    </div>
  );
}

export default function TIL() {
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const stats = useDiscussionStats();

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of tilEntries) {
      for (const tag of entry.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const filtered = useMemo(() => {
    return tilEntries.filter((entry) => {
      if (activeTag && !entry.tags.includes(activeTag)) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.content.toLowerCase().includes(q) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [search, activeTag]);

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  return (
    <SectionHeading title="til" subtitle="Today I Learned">
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

      <div className="flex flex-col gap-10">
        <AnimatePresence mode="popLayout">
          {filtered.map((entry, i) => {
            const entryStats = stats[entry.slug];
            const isExpanded = expandedSlug === entry.slug;

            return (
              <motion.article
                key={entry.slug}
                id={entry.slug}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="rounded-lg border p-6"
                style={{
                  backgroundColor: "var(--ctp-mantle)",
                  borderColor: "var(--ctp-surface0)",
                }}
              >
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-mono text-lg font-bold" style={{ color: "var(--ctp-blue)" }}>
                    <Highlight text={entry.title} query={search} />
                  </h2>
                  <div className="flex items-center gap-3">
                    {entryStats && <StatsBadge reactions={entryStats.reactions} comments={entryStats.comments} />}
                    <time className="shrink-0 font-mono text-xs" style={{ color: "var(--ctp-subtext0)" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagClick(tag)}
                      className="rounded-full px-2 py-0.5 font-mono text-xs transition-colors"
                      style={{
                        backgroundColor: activeTag === tag ? "var(--ctp-blue)" : "var(--ctp-surface0)",
                        color: activeTag === tag ? "var(--ctp-base)" : "var(--ctp-subtext0)",
                      }}
                    >
                      <Highlight text={`#${tag}`} query={search} />
                    </button>
                  ))}
                </div>
                <Markdown content={entry.content} />

                <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--ctp-surface0)" }}>
                  <button
                    onClick={() => setExpandedSlug(isExpanded ? null : entry.slug)}
                    className="font-mono text-xs transition-colors"
                    style={{ color: "var(--ctp-subtext0)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ctp-blue)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ctp-subtext0)")}
                  >
                    {isExpanded ? "Hide comments ▲" : "Show comments ▼"}
                  </button>
                  {isExpanded && <Comments term={entry.slug} />}
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </SectionHeading>
  );
}
