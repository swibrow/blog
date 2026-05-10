import { useState } from "react";

interface Tool {
  name: string;
  url: string;
  description: string;
  category: string;
}

interface Props {
  tools: Tool[];
  categories: string[];
}

const categoryColors: Record<string, string> = {
  "Terminal & Shell": "var(--ctp-green)",
  "Package Management": "var(--ctp-peach)",
  "CLI Utilities": "var(--ctp-blue)",
  "TUI Applications": "var(--ctp-mauve)",
};

export default function ToolsList({ tools, categories }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? tools.filter((t) => t.category === active) : tools;

  return (
    <div className="flex flex-col gap-8">
      <a
        href="https://github.com/swibrow/dotfiles"
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border p-4 transition-all hover:-translate-y-0.5"
        style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          <div>
            <h2 className="mb-0.5 text-lg font-bold" style={{ color: "var(--ctp-yellow)" }}>
              Dotfiles
            </h2>
            <p className="mb-0 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
              My configuration files and setup scripts — the source of truth
            </p>
          </div>
        </div>
      </a>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActive(null)}
          className="rounded-full border px-3 py-1 font-mono text-xs transition-all"
          style={{
            borderColor: !active ? "var(--ctp-lavender)" : "var(--ctp-surface1)",
            backgroundColor: !active ? "var(--ctp-surface0)" : "transparent",
            color: !active ? "var(--ctp-lavender)" : "var(--ctp-subtext0)",
          }}
        >
          all ({tools.length})
        </button>
        {categories.map((cat) => {
          const isActive = active === cat;
          const color = categoryColors[cat] || "var(--ctp-text)";
          const count = tools.filter((t) => t.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActive(isActive ? null : cat)}
              className="rounded-full border px-3 py-1 font-mono text-xs transition-all"
              style={{
                borderColor: isActive ? color : "var(--ctp-surface1)",
                backgroundColor: isActive ? "var(--ctp-surface0)" : "transparent",
                color: isActive ? color : "var(--ctp-subtext0)",
              }}
            >
              {cat.toLowerCase()} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((tool) => {
          const color = categoryColors[tool.category] || "var(--ctp-blue)";
          return (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border p-4 transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div>
                  <h2 className="mb-0.5 text-base font-bold" style={{ color: "var(--ctp-text)" }}>
                    {tool.name}
                  </h2>
                  <p className="mb-0 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
                    {tool.description}
                  </p>
                  <span className="mt-2 inline-block font-mono text-xs" style={{ color }}>
                    {tool.category.toLowerCase()}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
